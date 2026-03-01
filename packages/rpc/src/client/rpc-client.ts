/**
 * RpcClient — high-level client: connect to server + get proxies.
 */

import { RpcPeer } from "../peer.js";
import type { RpcSerializer } from "../serializer.js";
import { connectWsTransport } from "./ws-transport.js";
import { createRpcProxy } from "./rpc-proxy.js";

export interface RpcClientOptions {
  url: string;
  serializer?: RpcSerializer;
}

export class RpcClient implements Disposable {
  readonly #peer: RpcPeer;

  private constructor(peer: RpcPeer) {
    this.#peer = peer;
  }

  static async connect(options: RpcClientOptions): Promise<RpcClient> {
    const transport = await connectWsTransport({
      url: options.url,
      serializer: options.serializer,
    });
    const peer = new RpcPeer({ transport });
    return new RpcClient(peer);
  }

  get peer(): RpcPeer {
    return this.#peer;
  }

  getProxy<T extends object>(
    serviceName: string,
    computedMethods?: string[]
  ): T {
    return createRpcProxy<T>(this.#peer, serviceName, computedMethods);
  }

  [Symbol.dispose](): void {
    this.#peer[Symbol.dispose]();
  }
}
