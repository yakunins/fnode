/**
 * RpcTransport — abstraction over the message channel.
 *
 * Implementations: linked pair (for testing), WebSocket client/server.
 */

import { TypedEvent } from "@fnodejs/core";
import type { RpcMessage } from "./protocol.js";

export interface RpcTransport extends Disposable {
  send(message: RpcMessage): void;
  readonly onMessage: TypedEvent<RpcMessage>;
  readonly onClose: TypedEvent<void>;
  readonly isClosed: boolean;
}

/**
 * Creates two linked transports for in-process testing.
 * Messages sent on one arrive on the other synchronously.
 */
export function createLinkedTransports(): [RpcTransport, RpcTransport] {
  const a = createHalfTransport();
  const b = createHalfTransport();

  // Wire: a.send → b.onMessage, b.send → a.onMessage
  a._peer = b;
  b._peer = a;

  return [a, b];
}

interface LinkedTransport extends RpcTransport {
  _peer: LinkedTransport | undefined;
}

function createHalfTransport(): LinkedTransport {
  const onMessage = new TypedEvent<RpcMessage>();
  const onClose = new TypedEvent<void>();
  let closed = false;
  let peer: LinkedTransport | undefined;

  const transport: LinkedTransport = {
    get _peer() {
      return peer;
    },
    set _peer(p: LinkedTransport | undefined) {
      peer = p;
    },

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
      if (!peer || peer.isClosed) throw new Error("Peer transport is closed");
      peer.onMessage.fire(message);
    },

    [Symbol.dispose](): void {
      if (closed) return;
      closed = true;
      onClose.fire();
      onClose.clear();
      onMessage.clear();
      // Close peer too
      if (peer && !peer.isClosed) {
        peer[Symbol.dispose]();
      }
    },
  };

  return transport;
}
