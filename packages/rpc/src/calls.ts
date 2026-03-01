/**
 * RPC call tracking — outbound (client) and inbound (server) call state.
 */

import type { RpcMethodRef } from "./protocol.js";

/** Tracks a pending outbound call (client side). */
export class OutboundCall {
  readonly callId: number;
  readonly methodRef: RpcMethodRef;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly promise: Promise<unknown>;

  constructor(callId: number, methodRef: RpcMethodRef) {
    this.callId = callId;
    this.methodRef = methodRef;
    const { promise, resolve, reject } = Promise.withResolvers<unknown>();
    this.promise = promise;
    this.resolve = resolve;
    this.reject = reject;
  }
}

/** Tracks an outbound compute call — adds invalidation callback. */
export class OutboundComputeCall extends OutboundCall {
  #onInvalidated: (() => void) | undefined;

  constructor(
    callId: number,
    methodRef: RpcMethodRef,
    onInvalidated: () => void
  ) {
    super(callId, methodRef);
    this.#onInvalidated = onInvalidated;
  }

  /** Called when server sends Invalidate message. */
  handleInvalidation(): void {
    this.#onInvalidated?.();
    this.#onInvalidated = undefined;
  }
}

/** Tracks an inbound compute call (server side) — holds invalidation subscription. */
export class InboundComputeCall implements Disposable {
  readonly callId: number;
  readonly methodRef: RpcMethodRef;
  #subscription: Disposable | undefined;

  constructor(
    callId: number,
    methodRef: RpcMethodRef,
    subscription: Disposable
  ) {
    this.callId = callId;
    this.methodRef = methodRef;
    this.#subscription = subscription;
  }

  [Symbol.dispose](): void {
    this.#subscription?.[Symbol.dispose]();
    this.#subscription = undefined;
  }
}
