/**
 * RPC server dispatch — routes inbound calls to service methods.
 *
 * For ComputeCall messages:
 * 1. Uses capture() to get the Computed instance
 * 2. Sends Ok with result value
 * 3. Subscribes to computed.onInvalidated → sends Invalidate
 * 4. Tracks subscription in InboundComputeCall for cleanup
 */

import { capture } from "@fnodejs/fusion";
import { RpcMessageType, type RpcMessage } from "../protocol.js";
import { InboundComputeCall } from "../calls.js";
import type { RpcServiceRegistry } from "../service-registry.js";
import type { RpcPeer } from "../peer.js";

export interface RpcDispatcher {
  dispatch(peer: RpcPeer, msg: RpcMessage): Promise<void>;
}

export function createDispatcher(registry: RpcServiceRegistry): RpcDispatcher {
  return {
    async dispatch(peer: RpcPeer, msg: RpcMessage): Promise<void> {
      if (!msg.methodRef) {
        peer.sendError(msg.callId, "Missing methodRef");
        return;
      }

      const methodDef = registry.getMethod(
        msg.methodRef.service,
        msg.methodRef.method
      );
      if (!methodDef) {
        peer.sendError(
          msg.callId,
          `Unknown method: ${msg.methodRef.service}.${msg.methodRef.method}`
        );
        return;
      }

      const args = Array.isArray(msg.data) ? msg.data : [];

      if (msg.type === RpcMessageType.ComputeCall && methodDef.isComputed) {
        // ComputeCall — use capture() to get the Computed instance
        try {
          const captured = await capture(() =>
            methodDef.fn.call(methodDef.target, ...args)
          );

          peer.sendOk(msg.callId, captured.value);

          // Subscribe to invalidation
          const sub = captured.computed.onInvalidated.once(() => {
            peer.sendInvalidate(msg.callId);
          });

          // Track for cleanup on disconnect
          const inbound = new InboundComputeCall(
            msg.callId,
            msg.methodRef,
            sub
          );
          peer.registerInbound(inbound);
        } catch (err) {
          peer.sendError(
            msg.callId,
            err instanceof Error ? err.message : String(err)
          );
        }
      } else {
        // Regular Call — just invoke and return
        try {
          const result = await methodDef.fn.call(methodDef.target, ...args);
          peer.sendOk(msg.callId, result);
        } catch (err) {
          peer.sendError(
            msg.callId,
            err instanceof Error ? err.message : String(err)
          );
        }
      }
    },
  };
}
