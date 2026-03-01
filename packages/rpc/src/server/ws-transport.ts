/**
 * Server-side WebSocket transport — wraps Bun ServerWebSocket as RpcTransport.
 */

import { TypedEvent } from "@fnode/core";
import type { RpcMessage } from "../protocol.js";
import type { RpcSerializer } from "../serializer.js";
import type { RpcTransport } from "../transport.js";

export function createServerWsTransport(
  ws: { send(data: string): void; close(): void },
  serializer: RpcSerializer
): RpcTransport {
  const onMessage = new TypedEvent<RpcMessage>();
  const onClose = new TypedEvent<void>();
  let closed = false;

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
    /** Called by ws-server when a text message arrives. */
    handleMessage(data: string): void {
      if (closed) return;
      onMessage.fire(serializer.decode(data));
    },
    /** Called by ws-server when connection closes. */
    handleClose(): void {
      if (closed) return;
      closed = true;
      onClose.fire();
      onClose.clear();
      onMessage.clear();
    },
    [Symbol.dispose](): void {
      if (closed) return;
      closed = true;
      try {
        ws.close();
      } catch {
        // Ignore close errors
      }
      onClose.fire();
      onClose.clear();
      onMessage.clear();
    },
  } as RpcTransport & {
    handleMessage(data: string): void;
    handleClose(): void;
  };
}

export type ServerWsTransport = ReturnType<typeof createServerWsTransport>;
