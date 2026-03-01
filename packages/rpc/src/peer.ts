/**
 * RpcPeer — connection manager, call tracking, message dispatch.
 *
 * Manages outbound calls (client side) and routes inbound messages.
 * For server-side dispatch, delegates to RpcDispatcher.
 */

import { TypedEvent } from "@fnode/core";
import {
  RpcMessageType,
  type RpcMessage,
  type RpcMethodRef,
} from "./protocol.js";
import type { RpcTransport } from "./transport.js";
import { OutboundCall, OutboundComputeCall, InboundComputeCall } from "./calls.js";
import type { RpcDispatcher } from "./server/dispatch.js";

export interface RpcPeerOptions {
  transport: RpcTransport;
  dispatcher?: RpcDispatcher;
}

export class RpcPeer implements Disposable {
  readonly #transport: RpcTransport;
  readonly #dispatcher: RpcDispatcher | undefined;
  readonly #outbound = new Map<number, OutboundCall>();
  readonly #inbound = new Map<number, InboundComputeCall>();
  readonly #onClose = new TypedEvent<void>();

  #nextCallId = 1;
  #disposed = false;

  constructor(options: RpcPeerOptions) {
    this.#transport = options.transport;
    this.#dispatcher = options.dispatcher;

    this.#transport.onMessage.on((msg) => this.#handleMessage(msg));
    this.#transport.onClose.on(() => this.#handleClose());
  }

  get isDisposed(): boolean {
    return this.#disposed;
  }

  get onClose(): TypedEvent<void> {
    return this.#onClose;
  }

  /** Invoke a regular (non-computed) method on the remote side. */
  async call(
    service: string,
    method: string,
    args?: unknown[]
  ): Promise<unknown> {
    const callId = this.#nextCallId++;
    const methodRef: RpcMethodRef = { service, method };

    const outbound = new OutboundCall(callId, methodRef);
    this.#outbound.set(callId, outbound);

    this.#transport.send({
      type: RpcMessageType.Call,
      callId,
      methodRef,
      data: args,
    });

    try {
      return await outbound.promise;
    } finally {
      this.#outbound.delete(callId);
    }
  }

  /** Invoke a @computed method on the remote side. */
  async computeCall(
    service: string,
    method: string,
    args: unknown[] | undefined,
    onInvalidated: () => void
  ): Promise<unknown> {
    const callId = this.#nextCallId++;
    const methodRef: RpcMethodRef = { service, method };

    const outbound = new OutboundComputeCall(callId, methodRef, onInvalidated);
    this.#outbound.set(callId, outbound);

    this.#transport.send({
      type: RpcMessageType.ComputeCall,
      callId,
      methodRef,
      data: args,
    });

    try {
      return await outbound.promise;
    } finally {
      // Keep in map for invalidation — don't delete from outbound
    }
  }

  /** Send a response message (used by dispatcher). */
  sendOk(callId: number, data: unknown): void {
    this.#transport.send({
      type: RpcMessageType.Ok,
      callId,
      data,
    });
  }

  /** Send an error response (used by dispatcher). */
  sendError(callId: number, error: string): void {
    this.#transport.send({
      type: RpcMessageType.Error,
      callId,
      error,
    });
  }

  /** Send invalidation notification (used by dispatcher). */
  sendInvalidate(callId: number): void {
    this.#transport.send({
      type: RpcMessageType.Invalidate,
      callId,
    });
  }

  /** Register an inbound compute call for cleanup tracking. */
  registerInbound(call: InboundComputeCall): void {
    this.#inbound.set(call.callId, call);
  }

  #handleMessage(msg: RpcMessage): void {
    switch (msg.type) {
      case RpcMessageType.Ok:
        this.#handleOk(msg);
        break;
      case RpcMessageType.Error:
        this.#handleError(msg);
        break;
      case RpcMessageType.Invalidate:
        this.#handleInvalidate(msg);
        break;
      case RpcMessageType.Call:
      case RpcMessageType.ComputeCall:
        this.#handleInboundCall(msg);
        break;
      case RpcMessageType.Cancel:
        this.#handleCancel(msg);
        break;
    }
  }

  #handleOk(msg: RpcMessage): void {
    const outbound = this.#outbound.get(msg.callId);
    if (!outbound) return;
    // For regular calls, remove from map. For compute calls, keep for invalidation.
    if (!(outbound instanceof OutboundComputeCall)) {
      this.#outbound.delete(msg.callId);
    }
    outbound.resolve(msg.data);
  }

  #handleError(msg: RpcMessage): void {
    const outbound = this.#outbound.get(msg.callId);
    if (!outbound) return;
    this.#outbound.delete(msg.callId);
    outbound.reject(new Error(msg.error ?? "Unknown RPC error"));
  }

  #handleInvalidate(msg: RpcMessage): void {
    const outbound = this.#outbound.get(msg.callId);
    if (outbound instanceof OutboundComputeCall) {
      this.#outbound.delete(msg.callId);
      outbound.handleInvalidation();
    }
  }

  #handleInboundCall(msg: RpcMessage): void {
    if (!this.#dispatcher) {
      this.sendError(msg.callId, "No dispatcher configured");
      return;
    }
    // Dispatch asynchronously
    this.#dispatcher.dispatch(this, msg).catch((err) => {
      this.sendError(
        msg.callId,
        err instanceof Error ? err.message : String(err)
      );
    });
  }

  #handleCancel(msg: RpcMessage): void {
    // Clean up inbound compute call if it exists
    const inbound = this.#inbound.get(msg.callId);
    if (inbound) {
      this.#inbound.delete(msg.callId);
      inbound[Symbol.dispose]();
    }
  }

  #handleClose(): void {
    // Clean up all inbound compute calls
    for (const [, call] of this.#inbound) {
      call[Symbol.dispose]();
    }
    this.#inbound.clear();

    // Reject all pending outbound calls
    for (const [, call] of this.#outbound) {
      call.reject(new Error("Connection closed"));
    }
    this.#outbound.clear();

    this.#onClose.fire();
  }

  [Symbol.dispose](): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#transport[Symbol.dispose]();
  }
}
