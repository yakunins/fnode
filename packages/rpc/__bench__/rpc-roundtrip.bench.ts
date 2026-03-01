import { describe, bench, beforeEach } from "vitest";
import { computed, ComputedRegistry, Invalidation } from "@fnodejs/fusion";
import { RpcPeer } from "../src/peer.js";
import { createLinkedTransports } from "../src/transport.js";
import { createDispatcher } from "../src/server/dispatch.js";
import { RpcServiceRegistry } from "../src/service-registry.js";
import { createRpcProxy } from "../src/client/rpc-proxy.js";

// --- Server-side services ---

class MathService {
  async add(a: number, b: number): Promise<number> {
    return a + b;
  }
}

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
  const math = new MathService();
  const counter = new CounterService();
  registry.register("Math", math);
  registry.register("Counter", counter);

  const dispatcher = createDispatcher(registry);
  const serverPeer = new RpcPeer({ transport: serverTransport, dispatcher });
  const clientPeer = new RpcPeer({ transport: clientTransport });
  const proxy = createRpcProxy<CounterService>(clientPeer, "Counter", ["get"]);

  return { clientPeer, serverPeer, counter, proxy, math };
}

describe("RPC round-trip (linked transport)", () => {
  let clientPeer: RpcPeer;
  let serverPeer: RpcPeer;
  let proxy: { get(key: string): Promise<number> };

  beforeEach(() => {
    ComputedRegistry.clear();
    const rpc = setupRpc();
    clientPeer = rpc.clientPeer;
    serverPeer = rpc.serverPeer;
    proxy = rpc.proxy;
  });

  bench("regular call: add(a, b)", async () => {
    await clientPeer.call("Math", "add", [3, 7]);
  });

  bench("compute call: @computed method (cold)", async () => {
    ComputedRegistry.clear();
    await proxy.get("key-0");
  });

  bench("compute call: @computed method (hot)", async () => {
    await proxy.get("key-0");
  });
});

describe("RPC payload size", () => {
  let clientPeer: RpcPeer;

  beforeEach(() => {
    ComputedRegistry.clear();
    const [clientTransport, serverTransport] = createLinkedTransports();
    const registry = new RpcServiceRegistry();

    class PayloadService {
      async echo(data: unknown): Promise<unknown> {
        return data;
      }
    }

    registry.register("Payload", new PayloadService());
    const dispatcher = createDispatcher(registry);
    new RpcPeer({ transport: serverTransport, dispatcher });
    clientPeer = new RpcPeer({ transport: clientTransport });
  });

  bench("small payload (number)", async () => {
    await clientPeer.call("Payload", "echo", [42]);
  });

  bench("medium payload (object)", async () => {
    await clientPeer.call("Payload", "echo", [{ id: 1, name: "test", tags: ["a", "b"] }]);
  });

  bench("large payload (100-element array)", async () => {
    const arr = Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` }));
    await clientPeer.call("Payload", "echo", [arr]);
  });
});
