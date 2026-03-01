/**
 * @computed — decorator for methods that produce cached, dependency-tracked values.
 *
 * Mirrors ActualLab.Fusion [ComputeMethod]:
 * - Intercepts method calls to check cache first
 * - If cached & consistent → return cached value (no execution)
 * - If not → execute method within ComputeContext, capture dependencies, cache result
 * - In invalidation scope → find cached value and invalidate it
 */

import { ComputedInput, Result } from "@fnode/core";
import { Computed, type ComputedOptions } from "./computed.js";
import { ComputeContext } from "./compute-context.js";
import { ComputedRegistry } from "./computed-registry.js";

/** Symbol marker for detecting @computed methods in RPC service registry. */
export const COMPUTED_METHOD = Symbol.for("fnode.computedMethod");

export function computed(options?: ComputedOptions) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: T,
    context: ClassMethodDecoratorContext
  ): T {
    const methodName = String(context.name);

    const replacement = async function (
      this: object,
      ...args: unknown[]
    ): Promise<unknown> {
      const input = new ComputedInput(this, methodName, args);

      // --- Invalidation mode ---
      if (ComputeContext.isInvalidating) {
        const existing = ComputedRegistry.get(input.key);
        if (existing) {
          existing.invalidate();
        }
        return undefined;
      }

      // --- Check cache (fast path, no lock) ---
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

      // --- Acquire per-input lock (prevents duplicate computation) ---
      using _lock = await ComputedRegistry.inputLocks.lock(input.key);

      // Double-check after acquiring lock
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

      // --- Compute ---
      // Save parent context to restore dependency registration after
      const parentCtx = ComputeContext.current;

      const comp = new Computed<unknown>(input, options);

      // Execute method within ComputeContext for this computed.
      // ComputeContext.run propagates through awaits via AsyncLocalStorage.
      const result = await ComputeContext.run(comp, async () => {
        try {
          const value = await (target as Function).call(this, ...args);
          return Result.ok(value);
        } catch (e) {
          return Result.err(e instanceof Error ? e : new Error(String(e)));
        }
      });

      comp.trySetOutput(result);

      // Register in global cache
      ComputedRegistry.register(comp);

      // Hook up auto-unregister on invalidation
      comp.onInvalidated.once(() => {
        ComputedRegistry.unregister(comp);
      });

      // Register as dependency of parent computation
      if (parentCtx?.computed) {
        parentCtx.computed.addDependency(comp);
      }

      // Return value or throw error
      if (result.hasError) {
        throw result.error;
      }
      return result.value;
    } as unknown as T;

    (replacement as any)[COMPUTED_METHOD] = true;
    return replacement;
  };
}
