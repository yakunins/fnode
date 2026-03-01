import { describe, it, expect } from "vitest";
import { RpcMessageType, type RpcMessage } from "../src/protocol.js";
import { JsonRpcSerializer } from "../src/serializer.js";

describe("RpcMessageType", () => {
  it("has correct numeric values", () => {
    expect(RpcMessageType.Call).toBe(10);
    expect(RpcMessageType.ComputeCall).toBe(11);
    expect(RpcMessageType.Ok).toBe(20);
    expect(RpcMessageType.Error).toBe(21);
    expect(RpcMessageType.Cancel).toBe(22);
    expect(RpcMessageType.Invalidate).toBe(30);
  });
});

describe("JsonRpcSerializer", () => {
  it("round-trips a Call message", () => {
    const msg: RpcMessage = {
      type: RpcMessageType.Call,
      callId: 1,
      methodRef: { service: "Counter", method: "get" },
      data: ["x"],
    };
    const encoded = JsonRpcSerializer.encode(msg);
    const decoded = JsonRpcSerializer.decode(encoded);
    expect(decoded).toEqual(msg);
  });

  it("round-trips a ComputeCall message", () => {
    const msg: RpcMessage = {
      type: RpcMessageType.ComputeCall,
      callId: 2,
      methodRef: { service: "Counter", method: "get" },
      data: ["key1"],
    };
    const decoded = JsonRpcSerializer.decode(JsonRpcSerializer.encode(msg));
    expect(decoded).toEqual(msg);
  });

  it("round-trips an Ok message with data", () => {
    const msg: RpcMessage = {
      type: RpcMessageType.Ok,
      callId: 3,
      data: { count: 42, items: [1, 2, 3] },
    };
    const decoded = JsonRpcSerializer.decode(JsonRpcSerializer.encode(msg));
    expect(decoded).toEqual(msg);
  });

  it("round-trips an Error message", () => {
    const msg: RpcMessage = {
      type: RpcMessageType.Error,
      callId: 4,
      error: "Not found",
    };
    const decoded = JsonRpcSerializer.decode(JsonRpcSerializer.encode(msg));
    expect(decoded).toEqual(msg);
  });

  it("round-trips an Invalidate message", () => {
    const msg: RpcMessage = {
      type: RpcMessageType.Invalidate,
      callId: 5,
    };
    const decoded = JsonRpcSerializer.decode(JsonRpcSerializer.encode(msg));
    expect(decoded).toEqual(msg);
  });

  it("round-trips a Cancel message", () => {
    const msg: RpcMessage = {
      type: RpcMessageType.Cancel,
      callId: 6,
    };
    const decoded = JsonRpcSerializer.decode(JsonRpcSerializer.encode(msg));
    expect(decoded).toEqual(msg);
  });

  it("handles undefined optional fields", () => {
    const msg: RpcMessage = {
      type: RpcMessageType.Ok,
      callId: 7,
    };
    const decoded = JsonRpcSerializer.decode(JsonRpcSerializer.encode(msg));
    expect(decoded.type).toBe(RpcMessageType.Ok);
    expect(decoded.callId).toBe(7);
    expect(decoded.data).toBeUndefined();
    expect(decoded.error).toBeUndefined();
    expect(decoded.methodRef).toBeUndefined();
  });
});
