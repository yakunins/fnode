import { describe, it, expect, beforeEach } from "vitest";
import { ComputedRegistry } from "@fnodejs/fusion";
import { RpcMessageType, type RpcMessage } from "../src/protocol.js";
import { createLinkedTransports, type RpcTransport } from "../src/transport.js";
import { ReconnectingTransport } from "../src/client/reconnect.js";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  ComputedRegistry.clear();
});

describe("ReconnectingTransport", () => {
  it("forwards messages while connected", () => {
    const [a, b] = createLinkedTransports();
    const reconnecting = new ReconnectingTransport(a, {
      connect: async () => createLinkedTransports()[0],
    });

    const received: RpcMessage[] = [];
    reconnecting.onMessage.on((msg) => received.push(msg));

    b.send({ type: RpcMessageType.Ok, callId: 1, data: 42 });

    expect(received).toHaveLength(1);
    expect(received[0].data).toBe(42);

    reconnecting[Symbol.dispose]();
  });

  it("sends messages through inner transport", () => {
    const [a, b] = createLinkedTransports();
    const reconnecting = new ReconnectingTransport(a, {
      connect: async () => createLinkedTransports()[0],
    });

    const received: RpcMessage[] = [];
    b.onMessage.on((msg) => received.push(msg));

    reconnecting.send({ type: RpcMessageType.Call, callId: 1 });
    expect(received).toHaveLength(1);

    reconnecting[Symbol.dispose]();
  });

  it("reconnects after disconnect", async () => {
    const [a1, b1] = createLinkedTransports();
    const [a2, b2] = createLinkedTransports();
    let connectCalls = 0;

    const reconnecting = new ReconnectingTransport(a1, {
      connect: async () => {
        connectCalls++;
        return a2;
      },
      initialDelayMs: 10,
    });

    // Disconnect the first transport
    b1[Symbol.dispose]();

    // Wait for reconnect
    await delay(50);

    expect(connectCalls).toBe(1);
    expect(reconnecting.isReconnecting).toBe(false);

    // Should now be able to receive messages on new transport
    const received: RpcMessage[] = [];
    reconnecting.onMessage.on((msg) => received.push(msg));

    b2.send({ type: RpcMessageType.Ok, callId: 2, data: "reconnected" });
    expect(received).toHaveLength(1);
    expect(received[0].data).toBe("reconnected");

    reconnecting[Symbol.dispose]();
  });

  it("retries with exponential backoff", async () => {
    const [a1, b1] = createLinkedTransports();
    let attempts = 0;

    const reconnecting = new ReconnectingTransport(a1, {
      connect: async () => {
        attempts++;
        if (attempts < 3) throw new Error("not ready");
        return createLinkedTransports()[0];
      },
      initialDelayMs: 10,
      maxDelayMs: 100,
    });

    b1[Symbol.dispose]();

    // Wait for retries
    await delay(200);

    expect(attempts).toBe(3);
    expect(reconnecting.isReconnecting).toBe(false);

    reconnecting[Symbol.dispose]();
  });

  it("gives up after maxAttempts", async () => {
    const [a1, b1] = createLinkedTransports();
    let attempts = 0;

    const reconnecting = new ReconnectingTransport(a1, {
      connect: async () => {
        attempts++;
        throw new Error("never ready");
      },
      initialDelayMs: 10,
      maxAttempts: 3,
    });

    let closeFired = false;
    reconnecting.onClose.on(() => (closeFired = true));

    b1[Symbol.dispose]();

    await delay(200);

    expect(attempts).toBe(3);
    expect(reconnecting.isClosed).toBe(true);
    expect(closeFired).toBe(true);
  });

  it("fires onReconnected callback", async () => {
    const [a1, b1] = createLinkedTransports();
    let reconnected = false;

    const reconnecting = new ReconnectingTransport(a1, {
      connect: async () => createLinkedTransports()[0],
      initialDelayMs: 10,
      onReconnected: () => {
        reconnected = true;
      },
    });

    b1[Symbol.dispose]();
    await delay(50);

    expect(reconnected).toBe(true);

    reconnecting[Symbol.dispose]();
  });

  it("does not reconnect after manual dispose", async () => {
    const [a1, b1] = createLinkedTransports();
    let connectCalls = 0;

    const reconnecting = new ReconnectingTransport(a1, {
      connect: async () => {
        connectCalls++;
        return createLinkedTransports()[0];
      },
      initialDelayMs: 10,
    });

    reconnecting[Symbol.dispose]();

    // Even if inner closes, should not attempt reconnect
    await delay(50);
    expect(connectCalls).toBe(0);
  });

  it("throws when sending while reconnecting", async () => {
    const [a1, b1] = createLinkedTransports();
    const reconnecting = new ReconnectingTransport(a1, {
      connect: async () => {
        await delay(100);
        return createLinkedTransports()[0];
      },
      initialDelayMs: 10,
    });

    b1[Symbol.dispose]();
    await delay(20); // In reconnecting state

    expect(() =>
      reconnecting.send({ type: RpcMessageType.Call, callId: 1 })
    ).toThrow("reconnecting");

    reconnecting[Symbol.dispose]();
  });
});
