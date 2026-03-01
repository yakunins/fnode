/**
 * RPC serializer — encodes/decodes RpcMessages for transport.
 */

import type { RpcMessage } from "./protocol.js";

export interface RpcSerializer {
  encode(message: RpcMessage): string;
  decode(data: string): RpcMessage;
}

/** JSON-based serializer. */
export const JsonRpcSerializer: RpcSerializer = {
  encode(message: RpcMessage): string {
    return JSON.stringify(message);
  },
  decode(data: string): RpcMessage {
    return JSON.parse(data) as RpcMessage;
  },
};
