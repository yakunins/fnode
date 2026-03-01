import { describe, bench } from "vitest";
import { computed, ComputedRegistry, Invalidation } from "@fnodejs/fusion";
import { RpcPeer } from "../src/peer.js";
import { createLinkedTransports } from "../src/transport.js";
import { createDispatcher } from "../src/server/dispatch.js";
import { RpcServiceRegistry } from "../src/service-registry.js";
import { createRpcProxy } from "../src/client/rpc-proxy.js";

// --- Service ---

class BenchService {
  private counter = 0;

  @computed()
  async getValue(): Promise<number> {
    return this.counter;
  }

  @computed()
  async echo(input: string): Promise<string> {
    return input;
  }

  increment(): void {
    this.counter++;
    using _ = Invalidation.begin();
    this.getValue();
  }
}

function setupRpc() {
  const [clientTransport, serverTransport] = createLinkedTransports();
  const registry = new RpcServiceRegistry();
  const service = new BenchService();
  registry.register("bench", service);

  const dispatcher = createDispatcher(registry);
  const serverPeer = new RpcPeer({ transport: serverTransport, dispatcher });
  const clientPeer = new RpcPeer({ transport: clientTransport });
  const proxy = createRpcProxy<{ getValue(): Promise<number>; echo(s: string): Promise<string> }>(
    clientPeer, "bench", ["getValue", "echo"]
  );

  return { clientPeer, serverPeer, service, proxy };
}

// --- Benchmarks ---

describe("RPC invalidation + re-fetch (linked transport)", () => {
  const rpc = setupRpc();

  bench("invalidate → re-fetch single value", async () => {
    rpc.service.increment();
    await rpc.proxy.getValue();
  });

  bench("echo (1KB string)", async () => {
    await rpc.proxy.echo("x".repeat(1024));
  });
});
