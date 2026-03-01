import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

const hasBun = typeof globalThis.Bun !== "undefined";
const describeWs = hasBun ? describe : describe.skip;
import {
  computed,
  ComputedRegistry,
  Invalidation,
  capture,
} from "@fnode/fusion";
import { RpcServiceRegistry } from "../src/service-registry.js";
import { startRpcServer, type RpcServer } from "../src/server/ws-server.js";
import { RpcClient } from "../src/client/rpc-client.js";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  async echo(msg: string): Promise<string> {
    return `echo: ${msg}`;
  }
}

let server: RpcServer | undefined;
let client: RpcClient | undefined;

beforeEach(() => {
  ComputedRegistry.clear();
});

afterEach(() => {
  client?.[Symbol.dispose]();
  client = undefined;
  server?.[Symbol.dispose]();
  server = undefined;
});

async function setup() {
  const registry = new RpcServiceRegistry();
  const counter = new CounterService();
  registry.register("Counter", counter);

  server = startRpcServer({ registry, port: 0 });
  client = await RpcClient.connect({
    url: `ws://localhost:${server.port}`,
  });

  const proxy = client.getProxy<CounterService>("Counter", ["get"]);
  return { counter, proxy };
}

describeWs("WebSocket RPC", () => {
  it("connects and makes a regular call", async () => {
    const { proxy } = await setup();
    const result = await proxy.echo("hello");
    expect(result).toBe("echo: hello");
  });

  it("makes a compute call over WebSocket", async () => {
    const { counter, proxy } = await setup();
    counter.set("x", 42);

    const result = await proxy.get("x");
    expect(result).toBe(42);
  });

  it("receives invalidation over WebSocket", async () => {
    const { counter, proxy } = await setup();
    counter.set("x", 10);

    const c = await capture(() => proxy.get("x"));
    expect(c.value).toBe(10);

    // Invalidate on server
    counter.set("x", 99);

    // Wait for invalidation to arrive over WebSocket
    await c.whenInvalidated();

    // Re-fetch
    const c2 = await c.update();
    expect(c2.value).toBe(99);
  });

  it("handles multiple clients", async () => {
    const registry = new RpcServiceRegistry();
    const counter = new CounterService();
    registry.register("Counter", counter);
    counter.set("x", 5);

    server = startRpcServer({ registry, port: 0 });

    const client1 = await RpcClient.connect({
      url: `ws://localhost:${server.port}`,
    });
    const client2 = await RpcClient.connect({
      url: `ws://localhost:${server.port}`,
    });

    const proxy1 = client1.getProxy<CounterService>("Counter", ["get"]);
    const proxy2 = client2.getProxy<CounterService>("Counter", ["get"]);

    const [r1, r2] = await Promise.all([proxy1.get("x"), proxy2.get("x")]);
    expect(r1).toBe(5);
    expect(r2).toBe(5);

    client1[Symbol.dispose]();
    client2[Symbol.dispose]();
  });

  it("handles error propagation over WebSocket", async () => {
    const { counter, proxy } = await setup();
    // Call a method that doesn't exist — tests error path
    const badProxy = client!.getProxy<any>("NonExistent", []);
    let error: Error | undefined;
    try {
      await badProxy.someMethod();
    } catch (e) {
      error = e as Error;
    }
    expect(error).toBeDefined();
    expect(error!.message).toContain("Unknown method");
  });
});
