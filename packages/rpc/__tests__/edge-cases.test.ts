/**
 * Novel edge-case tests — scenarios not covered by either Fusion .NET or FNode.
 *
 * 1. Invalidation storm coalescing: server deduplicates concurrent re-fetches
 * 2. Re-entrant invalidation cascades: mutation inside onInvalidated handler
 * 3. Registry clear mid-session: ComputedRegistry.clear() with active RPC subscriptions
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  computed,
  ComputedRegistry,
  Invalidation,
  capture,
} from "@fnode/fusion";
import { RpcPeer } from "../src/peer.js";
import { createLinkedTransports } from "../src/transport.js";
import { createDispatcher } from "../src/server/dispatch.js";
import { RpcServiceRegistry } from "../src/service-registry.js";
import { createRpcProxy } from "../src/client/rpc-proxy.js";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  ComputedRegistry.clear();
});

// ---------------------------------------------------------------------------
// Test 1: Invalidation storm coalescing under async backpressure
// ---------------------------------------------------------------------------

describe("invalidation storm coalescing", () => {
  it("server deduplicates concurrent re-fetches for the same input", async () => {
    let serverCallCount = 0;

    class TrackedCounter {
      #values = new Map<string, number>();

      set(key: string, value: number): void {
        this.#values.set(key, value);
        using _ = Invalidation.begin();
        this.get(key);
      }

      @computed()
      async get(key: string): Promise<number> {
        serverCallCount++;
        // Simulate some async work so concurrent calls overlap
        await delay(10);
        return this.#values.get(key) ?? 0;
      }
    }

    const counter = new TrackedCounter();
    counter.set("x", 1);

    // Create N independent client peers all connected to the same server
    const numClients = 5;
    const registry = new RpcServiceRegistry();
    registry.register("Counter", counter);
    const dispatcher = createDispatcher(registry);

    const clients: { peer: RpcPeer; proxy: TrackedCounter }[] = [];
    for (let i = 0; i < numClients; i++) {
      const [clientTransport, serverTransport] = createLinkedTransports();
      const serverPeer = new RpcPeer({
        transport: serverTransport,
        dispatcher,
      });
      const clientPeer = new RpcPeer({ transport: clientTransport });
      const proxy = createRpcProxy<TrackedCounter>(clientPeer, "Counter", [
        "get",
      ]);
      clients.push({ peer: clientPeer, proxy });
    }

    // All clients fetch the initial value — each goes through its own RPC
    // but the server-side @computed decorator deduplicates via inputLocks
    serverCallCount = 0;
    const results = await Promise.all(
      clients.map((c) => c.proxy.get("x"))
    );

    // All clients got the correct value
    for (const r of results) {
      expect(r).toBe(1);
    }

    // Server should have computed get("x") exactly ONCE thanks to
    // the per-input AsyncLock in ComputedRegistry.inputLocks
    // (first call computes, others wait on lock then get cached result)
    expect(serverCallCount).toBe(1);

    // Now invalidate and have all clients re-fetch simultaneously
    counter.set("x", 42);
    await delay(20); // let invalidation propagate

    serverCallCount = 0;
    const results2 = await Promise.all(
      clients.map((c) => c.proxy.get("x"))
    );

    for (const r of results2) {
      expect(r).toBe(42);
    }

    // Again, only one actual computation on the server
    expect(serverCallCount).toBe(1);

    // Cleanup
    for (const c of clients) {
      c.peer[Symbol.dispose]();
    }
  });
});

// ---------------------------------------------------------------------------
// Test 2: Dependency graph correctness across re-entrant invalidation cycles
// ---------------------------------------------------------------------------

describe("re-entrant invalidation cascades", () => {
  it("mutation inside onInvalidated produces consistent snapshot on recompute", async () => {
    // Service where B and C are independent, and A depends on both
    class ReentrantService {
      #b = 1;
      #c = 10;

      setB(v: number): void {
        this.#b = v;
        using _ = Invalidation.begin();
        this.getB();
      }

      setC(v: number): void {
        this.#c = v;
        using _ = Invalidation.begin();
        this.getC();
      }

      @computed()
      async getB(): Promise<number> {
        return this.#b;
      }

      @computed()
      async getC(): Promise<number> {
        return this.#c;
      }

      @computed()
      async getA(): Promise<number> {
        const b = await this.getB();
        const c = await this.getC();
        return b + c;
      }
    }

    const svc = new ReentrantService();

    // Initial compute: A = B(1) + C(10) = 11
    const c = await capture(() => svc.getA());
    expect(c.value).toBe(11);

    // Set up the re-entrant scenario:
    // When B is invalidated, its onInvalidated fires.
    // We use that event to trigger a mutation on C.
    // This means invalidating B cascades to also invalidate C.
    const bComputed = await capture(() => svc.getB());
    bComputed.computed.onInvalidated.once(() => {
      // This runs synchronously during B's invalidation cascade
      svc.setC(100);
    });

    // Now invalidate B — this should:
    // 1. Invalidate B (fires onInvalidated)
    // 2. Inside handler: setC(100) → invalidate C
    // 3. A depends on both B and C → A invalidated
    svc.setB(2);

    await c.whenInvalidated();

    // Recompute A — must see BOTH fresh B=2 AND fresh C=100
    const c2 = await c.update();
    expect(c2.value).toBe(102); // 2 + 100, not 2 + 10 (stale C)
  });

  it("chained invalidation with intermediate mutation is consistent", async () => {
    class ChainService {
      #x = 1;
      #y = 10;

      setX(v: number): void {
        this.#x = v;
        using _ = Invalidation.begin();
        this.getX();
      }

      setY(v: number): void {
        this.#y = v;
        using _ = Invalidation.begin();
        this.getY();
      }

      @computed()
      async getX(): Promise<number> {
        return this.#x;
      }

      @computed()
      async getY(): Promise<number> {
        return this.#y;
      }

      @computed()
      async getProduct(): Promise<number> {
        const x = await this.getX();
        const y = await this.getY();
        return x * y;
      }
    }

    const svc = new ChainService();

    // Initial: product = 1 * 10 = 10
    const c = await capture(() => svc.getProduct());
    expect(c.value).toBe(10);

    // Mutate both X and Y before recomputing
    svc.setX(3);
    svc.setY(7);

    await c.whenInvalidated();
    const c2 = await c.update();
    expect(c2.value).toBe(21); // 3 * 7, not partial update
  });
});

// ---------------------------------------------------------------------------
// Test 3: Remote computed survives client-side registry clear
// ---------------------------------------------------------------------------

describe("registry clear mid-session", () => {
  function setupRpc() {
    const [clientTransport, serverTransport] = createLinkedTransports();
    const registry = new RpcServiceRegistry();

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

    const counter = new CounterService();
    registry.register("Counter", counter);

    const dispatcher = createDispatcher(registry);
    const serverPeer = new RpcPeer({
      transport: serverTransport,
      dispatcher,
    });
    const clientPeer = new RpcPeer({ transport: clientTransport });
    const proxy = createRpcProxy<CounterService>(clientPeer, "Counter", [
      "get",
    ]);

    return { clientPeer, serverPeer, counter, proxy };
  }

  it("handles registry clear without crash when server sends invalidation", async () => {
    const { clientPeer, counter, proxy } = setupRpc();
    counter.set("x", 10);

    // Establish RPC compute call — server is now subscribed to invalidation
    const result = await proxy.get("x");
    expect(result).toBe(10);

    // Clear the client-side registry — orphans the local Computed
    ComputedRegistry.clear();

    // Server invalidates — sends Invalidate message for a callId
    // that the client's outbound map still tracks, but the local
    // Computed is no longer in the registry
    counter.set("x", 20);

    // Wait for invalidation message to arrive and be processed
    await delay(10);

    // No crash, no unhandled rejection — the invalidation was handled
    // gracefully (outbound entry cleaned up)
    expect(true).toBe(true); // reaching here = no crash

    clientPeer[Symbol.dispose]();
  });

  it("fresh RPC call works after registry clear", async () => {
    const { clientPeer, counter, proxy } = setupRpc();
    counter.set("x", 10);

    // Establish compute call
    const r1 = await proxy.get("x");
    expect(r1).toBe(10);

    // Clear registry
    ComputedRegistry.clear();

    // Server invalidates
    counter.set("x", 99);
    await delay(10);

    // Next call should make a fresh RPC round-trip (no stale cache)
    const r2 = await proxy.get("x");
    expect(r2).toBe(99);

    clientPeer[Symbol.dispose]();
  });

  it("multiple registry clears during active session are safe", async () => {
    const { clientPeer, counter, proxy } = setupRpc();
    counter.set("x", 1);

    await proxy.get("x");
    ComputedRegistry.clear();

    counter.set("x", 2);
    await delay(10);
    await proxy.get("x");
    ComputedRegistry.clear();

    counter.set("x", 3);
    await delay(10);
    const final = await proxy.get("x");
    expect(final).toBe(3);

    clientPeer[Symbol.dispose]();
  });
});
