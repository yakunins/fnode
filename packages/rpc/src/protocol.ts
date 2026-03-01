/**
 * RPC wire protocol — message types and structures.
 *
 * Mirrors ActualLab.Rpc message protocol, simplified for JSON transport.
 */

export const RpcMessageType = {
  /** client → server: invoke method */
  Call: 10,
  /** client → server: invoke @computed method (stays registered for invalidation) */
  ComputeCall: 11,
  /** server → client: success result */
  Ok: 20,
  /** server → client: error result */
  Error: 21,
  /** either direction: cancel a pending call */
  Cancel: 22,
  /** server → client: a registered computed was invalidated */
  Invalidate: 30,
} as const;

export type RpcMessageType =
  (typeof RpcMessageType)[keyof typeof RpcMessageType];

/** Identifies a service + method for routing. */
export interface RpcMethodRef {
  readonly service: string;
  readonly method: string;
}

/** Wire message. */
export interface RpcMessage {
  readonly type: RpcMessageType;
  readonly callId: number;
  readonly methodRef?: RpcMethodRef;
  readonly data?: unknown;
  readonly error?: string;
}
