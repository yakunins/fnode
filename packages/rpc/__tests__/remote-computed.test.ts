import { describe, it, expect, beforeEach } from "vitest";
import {
  computed,
  ComputedRegistry,
  Invalidation,
  capture,
  ComputedState,
  FixedDelayer,
} from "@fnodejs/fusion";
import { RpcPeer } from "../src/peer.js";
import { createLinkedTransports } from "../src/transport.js";
import { createDispatcher } from "../src/server/dispatch.js";
import { RpcServiceRegistry } from "../src/service-registry.js";
import { createRpcProxy } from "../src/client/rpc-proxy.js";

beforeEach(() => {
  ComputedRegistry.clear();
});

// --- Server-side services ---
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

// --- Client-side service that depends on remote computed ---
class ClientSummer {
  readonly #counter: { get(key: string): Promise<number> };

  constructor(counter: { get(key: string): Promise<number> }) {
    this.#counter = counter;
  }

  @computed()
  async getSum(a: string, b: string): Promise<number> {
    const va = await this.#counter.get(a);
    const vb = await this.#counter.get(b);
    return va + vb;
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

describe("remote computed in local dependency graph", () => {
  it("remote computed participates in capture()", async () => {
    const { clientPeer, counter, proxy } = setupRpc();
    counter.set("x", 42);

    const c = await capture(() => proxy.get("x"));
    expect(c.value).toBe(42);
    expect(c.computed.isConsistent).toBe(true);

    clientPeer[Symbol.dispose]();
  });

  it("capture detects remote invalidation", async () => {
    const { clientPeer, counter, proxy } = setupRpc();
    counter.set("x", 10);

    const c = await capture(() => proxy.get("x"));
    expect(c.value).toBe(10);

    // Set up waiting for invalidation
    const whenDone = c.whenInvalidated();

    // Invalidate on server
    counter.set("x", 20);

    // Should resolve
    await whenDone;

    // Update
    const c2 = await c.update();
    expect(c2.value).toBe(20);

    clientPeer[Symbol.dispose]();
  });

  it("local @computed depends on remote @computed", async () => {
    const { clientPeer, counter, proxy } = setupRpc();
    const summer = new ClientSummer(proxy);
    counter.set("a", 3);
    counter.set("b", 7);

    const result = await summer.getSum("a", "b");
    expect(result).toBe(10);

    clientPeer[Symbol.dispose]();
  });

  it("local @computed invalidates when remote dependency invalidates", async () => {
    const { clientPeer, counter, proxy } = setupRpc();
    const summer = new ClientSummer(proxy);
    counter.set("a", 3);
    counter.set("b", 7);

    const c = await capture(() => summer.getSum("a", "b"));
    expect(c.value).toBe(10);

    // Invalidate a server-side dependency
    counter.set("a", 100);
    await c.whenInvalidated();

    const c2 = await c.update();
    expect(c2.value).toBe(107);

    clientPeer[Symbol.dispose]();
  });

  it("ComputedState auto-updates on remote invalidation", async () => {
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const { clientPeer, counter, proxy } = setupRpc();
    counter.set("x", 1);

    const state = new ComputedState(() => proxy.get("x"), {
      updateDelayer: FixedDelayer.none,
    });

    // Wait for initial computation
    await delay(50);
    expect(state.value).toBe(1);

    // Invalidate on server
    counter.set("x", 99);

    // Wait for auto-update
    await delay(50);
    expect(state.value).toBe(99);

    state[Symbol.dispose]();
    clientPeer[Symbol.dispose]();
  });

  it("error from remote @computed propagates correctly", async () => {
    const [clientTransport, serverTransport] = createLinkedTransports();
    const registry = new RpcServiceRegistry();

    class FailService {
      @computed()
      async willFail(): Promise<never> {
        throw new Error("remote failure");
      }
    }

    registry.register("Fail", new FailService());
    const dispatcher = createDispatcher(registry);
    const serverPeer = new RpcPeer({
      transport: serverTransport,
      dispatcher,
    });
    const clientPeer = new RpcPeer({ transport: clientTransport });
    const proxy = createRpcProxy<FailService>(clientPeer, "Fail", [
      "willFail",
    ]);

    await expect(proxy.willFail()).rejects.toThrow("remote failure");

    clientPeer[Symbol.dispose]();
  });
});
