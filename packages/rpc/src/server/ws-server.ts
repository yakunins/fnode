/**
 * RpcServer — WebSocket server using Bun.serve().
 *
 * Accepts WebSocket connections and creates an RpcPeer per connection.
 */

import { TypedEvent } from "@fnodejs/core";
import { JsonRpcSerializer, type RpcSerializer } from "../serializer.js";
import { RpcPeer } from "../peer.js";
import type { RpcServiceRegistry } from "../service-registry.js";
import { createDispatcher, type RpcDispatcher } from "./dispatch.js";
import {
  createServerWsTransport,
  type ServerWsTransport,
} from "./ws-transport.js";

export interface RpcServerOptions {
  registry: RpcServiceRegistry;
  port?: number;
  hostname?: string;
  serializer?: RpcSerializer;
}

export interface RpcServer extends Disposable {
  readonly port: number;
  readonly hostname: string;
  readonly onPeerConnected: TypedEvent<RpcPeer>;
}

export function startRpcServer(options: RpcServerOptions): RpcServer {
  const serializer = options.serializer ?? JsonRpcSerializer;
  const dispatcher = createDispatcher(options.registry);
  const onPeerConnected = new TypedEvent<RpcPeer>();
  const peers = new Set<RpcPeer>();

  // Map WebSocket instances to their transports
  const wsToTransport = new WeakMap<object, ServerWsTransport>();

  const server = Bun.serve({
    port: options.port ?? 0,
    hostname: options.hostname ?? "localhost",

    fetch(req, server) {
      const upgraded = server.upgrade(req);
      if (!upgraded) {
        return new Response("WebSocket upgrade required", { status: 426 });
      }
      return undefined;
    },

    websocket: {
      open(ws) {
        const transport = createServerWsTransport(ws, serializer);
        wsToTransport.set(ws, transport);

        const peer = new RpcPeer({ transport, dispatcher });
        peers.add(peer);

        peer.onClose.once(() => {
          peers.delete(peer);
        });

        onPeerConnected.fire(peer);
      },

      message(ws, message) {
        const transport = wsToTransport.get(ws);
        if (transport && typeof message === "string") {
          (transport as any).handleMessage(message);
        }
      },

      close(ws) {
        const transport = wsToTransport.get(ws);
        if (transport) {
          (transport as any).handleClose();
        }
      },
    },
  });

  return {
    get port() {
      return server.port as number;
    },
    get hostname() {
      return server.hostname as string;
    },
    get onPeerConnected() {
      return onPeerConnected;
    },
    [Symbol.dispose]() {
      for (const peer of peers) {
        peer[Symbol.dispose]();
      }
      peers.clear();
      server.stop();
    },
  };
}
