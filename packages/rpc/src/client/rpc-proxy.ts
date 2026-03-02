/**
 * createRpcProxy<T>() — JS Proxy that routes method calls through RPC.
 *
 * For @computed methods:
 * - Creates a local Computed<T> so the result participates in the dependency graph
 * - Registers in ComputedRegistry for cache hits on repeated calls
 * - Wires incoming Invalidate → local computed.invalidate()
 *
 * For regular methods:
 * - Simply calls peer.call() and returns the result
 */

import { ComputedInput, Result } from "@fnodejs/core";
import { Computed, ComputeContext, ComputedRegistry } from "@fnodejs/fusion";
import type { RpcPeer } from "../peer.js";

/**
 * Create a proxy that routes all method calls to the remote peer.
 *
 * @param peer - The RPC peer to route calls through
 * @param serviceName - The service name for method routing
 * @param computedMethods - Names of methods that are @computed on the server
 */
export function createRpcProxy<T extends object>(
  peer: RpcPeer,
  serviceName: string,
  computedMethods?: string[]
): T {
  const computedSet = new Set(computedMethods ?? []);

  // Stable identity object for ComputedInput — same proxy = same service ID
  const serviceIdentity = { __rpcService: serviceName };

  return new Proxy({} as T, {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;

      const isComputed = computedSet.has(prop);
      const method = prop;

      return async (...args: unknown[]) => {
        if (isComputed) {
          return handleComputeCall(
            peer,
            serviceName,
            method,
            args,
            serviceIdentity
          );
        }
        return peer.call(serviceName, method, args);
      };
    },
  });
}

async function handleComputeCall(
  peer: RpcPeer,
  serviceName: string,
  method: string,
  args: unknown[],
  serviceIdentity: object
): Promise<unknown> {
  const input = new ComputedInput(serviceIdentity, method, args);

  // Check cache (fast path)
  const cached = ComputedRegistry.get(input.key);
  if (cached && cached.isConsistent) {
    // Register as dependency of current parent computation
    const parentCtx = ComputeContext.current;
    if (parentCtx?.computed) {
      parentCtx.computed.addDependency(cached);
    }
    return cached.output!.hasValue
      ? cached.output!.value
      : Promise.reject(cached.output!.error);
  }

  // Acquire per-input lock to prevent duplicate RPC calls
  using _lock = await ComputedRegistry.inputLocks.lock(input.key);

  // Double-check after lock
  const cachedAfterLock = ComputedRegistry.get(input.key);
  if (cachedAfterLock && cachedAfterLock.isConsistent) {
    const parentCtx = ComputeContext.current;
    if (parentCtx?.computed) {
      parentCtx.computed.addDependency(cachedAfterLock);
    }
    return cachedAfterLock.output!.hasValue
      ? cachedAfterLock.output!.value
      : Promise.reject(cachedAfterLock.output!.error);
  }

  const parentCtx = ComputeContext.current;

  // Create local Computed for the remote result
  const comp = new Computed<unknown>(input);

  // Make the RPC call — the onInvalidated callback will fire when server sends Invalidate
  try {
    const value = await peer.computeCall(
      serviceName,
      method,
      args,
      () => comp.invalidate()
    );

    comp.trySetOutput(Result.ok(value));
  } catch (err) {
    comp.trySetOutput(
      Result.err(err instanceof Error ? err : new Error(String(err)))
    );
  }

  // Register in global cache
  ComputedRegistry.register(comp);
  comp.setInvalidateCallback(() => {
    ComputedRegistry.unregister(comp);
  });

  // Register as dependency of parent computation
  if (parentCtx?.computed) {
    parentCtx.computed.addDependency(comp);
  }

  // Return value or throw error
  if (comp.output!.hasError) {
    throw comp.output!.error;
  }
  return comp.output!.value;
}
