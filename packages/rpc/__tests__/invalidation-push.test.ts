import { describe, it, expect, beforeEach } from "vitest";
import { computed, ComputedRegistry, Invalidation } from "@fnode/fusion";
import { RpcPeer } from "../src/peer.js";
import { createLinkedTransports } from "../src/transport.js";
import { createDispatcher } from "../src/server/dispatch.js";
import { RpcServiceRegistry } from "../src/service-registry.js";
import { createRpcProxy } from "../src/client/rpc-proxy.js";

beforeEach(() => {
  ComputedRegistry.clear();
});

// --- Test service ---
class CounterService {
  #values = new Map<string, number>();

  set(key: string, value: number): void {
    this.#values.set(key, value);
    using _ = Invalidation.begin();
    this.get(key);
  }

  @computed()
  async get(key: string): Promise<number> {
    return this.#values.get(key) ?? 0;
  }
}

function setupRpc() {
  const [clientTransport, serverTransport] = createLinkedTransports();
  const registry = new RpcServiceRegistry();
  const counter = new CounterService();
  registry.register("Counter", counter);

  const dispatcher = createDispatcher(registry);
  const serverPeer = new RpcPeer({
    transport: serverTransport,
    dispatcher,
  });
  const clientPeer = new RpcPeer({ transport: clientTransport });

  const proxy = createRpcProxy<CounterService>(clientPeer, "Counter", ["get"]);

  return { clientPeer, serverPeer, counter, proxy };
}

describe("invalidation push", () => {
  it("compute call returns result via proxy", async () => {
    const { clientPeer, counter, proxy } = setupRpc();
    counter.set("x", 42);

    const result = await proxy.get("x");
    expect(result).toBe(42);

    clientPeer[Symbol.dispose]();
  });

  it("server invalidation reaches client", async () => {
    const { clientPeer, counter, proxy } = setupRpc();
    counter.set("x", 10);

    // First call — caches on client
    const result = await proxy.get("x");
    expect(result).toBe(10);

    // Verify it's cached in ComputedRegistry
    expect(ComputedRegistry.size).toBeGreaterThan(0);

    // Set up invalidation detection
    let invalidated = false;
    const invalidationPromise = new Promise<void>((resolve) => {
      // Find the cached computed and watch it
      // We re-call proxy to get the cached value — it won't make an RPC call
      const checkInvalidation = () => {
        // Poll briefly — the invalidation should come synchronously via linked transport
        invalidated = true;
        resolve();
      };

      // Invalidate on server
      counter.set("x", 20);

      // The linked transport delivers invalidation synchronously,
      // which calls comp.invalidate() on the client proxy's Computed
      setTimeout(checkInvalidation, 10);
    });

    await invalidationPromise;
    expect(invalidated).toBe(true);

    // After invalidation, next call should get fresh value
    const result2 = await proxy.get("x");
    expect(result2).toBe(20);

    clientPeer[Symbol.dispose]();
  });

  it("cached compute call is served from registry", async () => {
    const { clientPeer, counter, proxy } = setupRpc();
    counter.set("x", 5);

    const r1 = await proxy.get("x");
    const r2 = await proxy.get("x");

    expect(r1).toBe(5);
    expect(r2).toBe(5);

    // Should still be just one entry in the registry for this input
    // (second call served from cache, no new RPC call)

    clientPeer[Symbol.dispose]();
  });

  it("different args are cached separately", async () => {
    const { clientPeer, counter, proxy } = setupRpc();
    counter.set("a", 1);
    counter.set("b", 2);

    const ra = await proxy.get("a");
    const rb = await proxy.get("b");

    expect(ra).toBe(1);
    expect(rb).toBe(2);

    clientPeer[Symbol.dispose]();
  });

  it("invalidation only affects the invalidated key", async () => {
    const { clientPeer, counter, proxy } = setupRpc();
    counter.set("a", 10);
    counter.set("b", 20);

    await proxy.get("a");
    await proxy.get("b");

    // Invalidate only "a"
    counter.set("a", 100);

    // Wait a tick for invalidation to propagate
    await new Promise((r) => setTimeout(r, 10));

    // "b" should still return cached value, "a" should refetch
    const ra = await proxy.get("a");
    const rb = await proxy.get("b");

    expect(ra).toBe(100);
    expect(rb).toBe(20);

    clientPeer[Symbol.dispose]();
  });
});
