import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { ComputedRegistry } from "@fnodejs/fusion";
import { RpcMessageType, type RpcMessage } from "../src/protocol.js";
import { JsonRpcSerializer } from "../src/serializer.js";
import {
  createServerWsTransport,
  type ServerWsTransport,
} from "../src/server/ws-transport.js";

beforeEach(() => {
  ComputedRegistry.clear();
});

describe("createServerWsTransport", () => {
  it("sends messages via ws.send", () => {
    const sent: string[] = [];
    const mockWs = {
      send(data: string) {
        sent.push(data);
      },
      close() {},
    };

    const transport = createServerWsTransport(mockWs, JsonRpcSerializer);
    const msg: RpcMessage = {
      type: RpcMessageType.Ok,
      callId: 1,
      data: 42,
    };

    transport.send(msg);
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0])).toEqual(msg);
  });

  it("fires onMessage when handleMessage is called", () => {
    const mockWs = { send() {}, close() {} };
    const transport = createServerWsTransport(
      mockWs,
      JsonRpcSerializer
    ) as ServerWsTransport & { handleMessage(data: string): void };

    const received: RpcMessage[] = [];
    transport.onMessage.on((msg) => received.push(msg));

    const msg: RpcMessage = {
      type: RpcMessageType.Call,
      callId: 1,
      methodRef: { service: "Svc", method: "fn" },
    };

    (transport as any).handleMessage(JsonRpcSerializer.encode(msg));
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(msg);
  });

  it("fires onClose when handleClose is called", () => {
    const mockWs = { send() {}, close() {} };
    const transport = createServerWsTransport(mockWs, JsonRpcSerializer);

    let closed = false;
    transport.onClose.on(() => (closed = true));

    (transport as any).handleClose();
    expect(closed).toBe(true);
    expect(transport.isClosed).toBe(true);
  });

  it("throws when sending on closed transport", () => {
    const mockWs = { send() {}, close() {} };
    const transport = createServerWsTransport(mockWs, JsonRpcSerializer);

    transport[Symbol.dispose]();

    expect(() =>
      transport.send({ type: RpcMessageType.Ok, callId: 1 })
    ).toThrow("closed");
  });
});
