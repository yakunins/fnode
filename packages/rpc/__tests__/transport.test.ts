import { describe, it, expect } from "vitest";
import { RpcMessageType, type RpcMessage } from "../src/protocol.js";
import { createLinkedTransports } from "../src/transport.js";

describe("createLinkedTransports", () => {
  it("delivers messages from A to B", () => {
    const [a, b] = createLinkedTransports();
    const received: RpcMessage[] = [];
    b.onMessage.on((msg) => received.push(msg));

    const msg: RpcMessage = {
      type: RpcMessageType.Call,
      callId: 1,
      methodRef: { service: "Svc", method: "foo" },
      data: [42],
    };
    a.send(msg);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(msg);
  });

  it("delivers messages from B to A", () => {
    const [a, b] = createLinkedTransports();
    const received: RpcMessage[] = [];
    a.onMessage.on((msg) => received.push(msg));

    const msg: RpcMessage = {
      type: RpcMessageType.Ok,
      callId: 1,
      data: "result",
    };
    b.send(msg);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(msg);
  });

  it("delivers multiple messages in order", () => {
    const [a, b] = createLinkedTransports();
    const received: number[] = [];
    b.onMessage.on((msg) => received.push(msg.callId));

    for (let i = 0; i < 5; i++) {
      a.send({ type: RpcMessageType.Call, callId: i });
    }

    expect(received).toEqual([0, 1, 2, 3, 4]);
  });

  it("fires onClose when disposed", () => {
    const [a, b] = createLinkedTransports();
    let aClosed = false;
    let bClosed = false;
    a.onClose.on(() => (aClosed = true));
    b.onClose.on(() => (bClosed = true));

    a[Symbol.dispose]();

    expect(aClosed).toBe(true);
    expect(bClosed).toBe(true);
    expect(a.isClosed).toBe(true);
    expect(b.isClosed).toBe(true);
  });

  it("closing one side closes the other", () => {
    const [a, b] = createLinkedTransports();
    let bClosed = false;
    b.onClose.on(() => (bClosed = true));

    a[Symbol.dispose]();

    expect(bClosed).toBe(true);
    expect(b.isClosed).toBe(true);
  });

  it("throws when sending on closed transport", () => {
    const [a, b] = createLinkedTransports();
    a[Symbol.dispose]();

    expect(() => {
      a.send({ type: RpcMessageType.Call, callId: 1 });
    }).toThrow("closed");
  });

  it("double dispose is safe", () => {
    const [a] = createLinkedTransports();
    a[Symbol.dispose]();
    expect(() => a[Symbol.dispose]()).not.toThrow();
  });
});
