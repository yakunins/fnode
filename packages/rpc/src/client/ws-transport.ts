/**
 * Client-side WebSocket transport — wraps browser/Bun WebSocket as RpcTransport.
 */

import { TypedEvent } from "@fnodejs/core";
import type { RpcMessage } from "../protocol.js";
import type { RpcSerializer } from "../serializer.js";
import type { RpcTransport } from "../transport.js";
import { JsonRpcSerializer } from "../serializer.js";

export interface WsTransportOptions {
  url: string;
  serializer?: RpcSerializer;
}

/**
 * Connect to a WebSocket server and return an RpcTransport.
 */
export async function connectWsTransport(
  options: WsTransportOptions
): Promise<RpcTransport> {
  const serializer = options.serializer ?? JsonRpcSerializer;
  const onMessage = new TypedEvent<RpcMessage>();
  const onClose = new TypedEvent<void>();
  let closed = false;

  const ws = new WebSocket(options.url);

  // Wait for connection to open
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = (e) => reject(new Error("WebSocket connection failed"));
  });

  ws.onmessage = (event) => {
    if (closed) return;
    let data: string;
    if (typeof event.data === "string") {
      data = event.data;
    } else if (event.data instanceof ArrayBuffer) {
      data = new TextDecoder().decode(event.data);
    } else if (typeof Buffer !== "undefined" && Buffer.isBuffer(event.data)) {
      data = (event.data as Buffer).toString("utf-8");
    } else {
      data = String(event.data);
    }
    onMessage.fire(serializer.decode(data));
  };

  ws.onclose = () => {
    if (closed) return;
    closed = true;
    onClose.fire();
    onClose.clear();
    onMessage.clear();
  };

  return {
    get isClosed() {
      return closed;
    },
    get onMessage() {
      return onMessage;
    },
    get onClose() {
      return onClose;
    },
    send(message: RpcMessage): void {
      if (closed) throw new Error("Transport is closed");
      ws.send(serializer.encode(message));
    },
    [Symbol.dispose](): void {
      if (closed) return;
      closed = true;
      ws.close();
      onClose.fire();
      onClose.clear();
      onMessage.clear();
    },
  };
}
