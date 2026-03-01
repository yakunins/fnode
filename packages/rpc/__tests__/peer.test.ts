import { describe, it, expect, beforeEach } from "vitest";
import { ComputedRegistry } from "@fnode/fusion";
import { RpcPeer } from "../src/peer.js";
import { createLinkedTransports } from "../src/transport.js";
import { createDispatcher } from "../src/server/dispatch.js";
import { RpcServiceRegistry } from "../src/service-registry.js";

beforeEach(() => {
  ComputedRegistry.clear();
});

// Simple non-computed service for basic call tests
class MathService {
  async add(a: number, b: number): Promise<number> {
    return a + b;
  }

  async multiply(a: number, b: number): Promise<number> {
    return a * b;
  }

  async failing(): Promise<never> {
    throw new Error("intentional error");
  }
}

function setupPeers() {
  const [clientTransport, serverTransport] = createLinkedTransports();
  const registry = new RpcServiceRegistry();
  const math = new MathService();
  registry.register("Math", math);

  const dispatcher = createDispatcher(registry);
  const serverPeer = new RpcPeer({
    transport: serverTransport,
    dispatcher,
  });
  const clientPeer = new RpcPeer({ transport: clientTransport });

  return { clientPeer, serverPeer, registry, math };
}

describe("RpcPeer", () => {
  it("makes a regular call and receives result", async () => {
    const { clientPeer, serverPeer } = setupPeers();

    const result = await clientPeer.call("Math", "add", [3, 7]);
    expect(result).toBe(10);

    clientPeer[Symbol.dispose]();
  });

  it("propagates errors from server", async () => {
    const { clientPeer, serverPeer } = setupPeers();

    await expect(
      clientPeer.call("Math", "failing", [])
    ).rejects.toThrow("intentional error");

    clientPeer[Symbol.dispose]();
  });

  it("handles unknown method", async () => {
    const { clientPeer, serverPeer } = setupPeers();

    await expect(
      clientPeer.call("Math", "nonexistent", [])
    ).rejects.toThrow("Unknown method");

    clientPeer[Symbol.dispose]();
  });

  it("handles unknown service", async () => {
    const { clientPeer, serverPeer } = setupPeers();

    await expect(
      clientPeer.call("NoSuchService", "foo", [])
    ).rejects.toThrow("Unknown method");

    clientPeer[Symbol.dispose]();
  });

  it("handles multiple concurrent calls", async () => {
    const { clientPeer, serverPeer } = setupPeers();

    const [r1, r2, r3] = await Promise.all([
      clientPeer.call("Math", "add", [1, 2]),
      clientPeer.call("Math", "multiply", [3, 4]),
      clientPeer.call("Math", "add", [10, 20]),
    ]);

    expect(r1).toBe(3);
    expect(r2).toBe(12);
    expect(r3).toBe(30);

    clientPeer[Symbol.dispose]();
  });

  it("rejects pending calls on disconnect", async () => {
    const [clientTransport, serverTransport] = createLinkedTransports();
    // No dispatcher — calls will never be answered
    const clientPeer = new RpcPeer({ transport: clientTransport });

    // Start a call that won't be answered, then close
    const callPromise = clientPeer.call("Math", "add", [1, 2]);

    // Close immediately — the call should be rejected
    clientPeer[Symbol.dispose]();

    await expect(callPromise).rejects.toThrow("closed");
  });

  it("fires onClose event when transport closes", async () => {
    const { clientPeer, serverPeer } = setupPeers();
    let closed = false;
    clientPeer.onClose.on(() => (closed = true));

    clientPeer[Symbol.dispose]();
    expect(closed).toBe(true);
  });

  it("handles no dispatcher gracefully", async () => {
    const [clientTransport, serverTransport] = createLinkedTransports();
    const clientPeer = new RpcPeer({ transport: clientTransport });
    const serverPeer = new RpcPeer({ transport: serverTransport });

    await expect(
      clientPeer.call("Math", "add", [1, 2])
    ).rejects.toThrow("No dispatcher configured");

    clientPeer[Symbol.dispose]();
  });
});
