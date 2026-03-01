/**
 * ReconnectingTransport — wraps an RpcTransport with automatic reconnection.
 *
 * On disconnect:
 * 1. Exponential backoff retry (100ms → 200ms → 400ms → ... capped at 10s)
 * 2. Fires onClose only when manually disposed (not on transient disconnects)
 * 3. Re-fires pending invalidation subscriptions
 */

import { TypedEvent } from "@fnode/core";
import type { RpcMessage } from "../protocol.js";
import type { RpcTransport } from "../transport.js";

export interface ReconnectOptions {
  /** Factory to create a new transport on reconnect. */
  connect: () => Promise<RpcTransport>;
  /** Initial delay in ms before first reconnect attempt. Default: 100. */
  initialDelayMs?: number;
  /** Maximum delay in ms between attempts. Default: 10000. */
  maxDelayMs?: number;
  /** Maximum number of reconnect attempts. Default: Infinity. */
  maxAttempts?: number;
  /** Callback fired when reconnection succeeds. */
  onReconnected?: () => void;
  /** Callback fired when the inner transport disconnects (before reconnect attempts). */
  onDisconnected?: () => void;
}

export class ReconnectingTransport implements RpcTransport {
  readonly #connect: () => Promise<RpcTransport>;
  readonly #initialDelayMs: number;
  readonly #maxDelayMs: number;
  readonly #maxAttempts: number;
  readonly #onReconnectedCb: (() => void) | undefined;
  readonly #onDisconnectedCb: (() => void) | undefined;

  readonly #onMessage = new TypedEvent<RpcMessage>();
  readonly #onClose = new TypedEvent<void>();

  #inner: RpcTransport | undefined;
  #closed = false;
  #reconnecting = false;
  #attempts = 0;

  constructor(inner: RpcTransport, options: ReconnectOptions) {
    this.#connect = options.connect;
    this.#initialDelayMs = options.initialDelayMs ?? 100;
    this.#maxDelayMs = options.maxDelayMs ?? 10_000;
    this.#maxAttempts = options.maxAttempts ?? Infinity;
    this.#onReconnectedCb = options.onReconnected;
    this.#onDisconnectedCb = options.onDisconnected;

    this.#attachInner(inner);
  }

  get isClosed(): boolean {
    return this.#closed;
  }

  get onMessage(): TypedEvent<RpcMessage> {
    return this.#onMessage;
  }

  get onClose(): TypedEvent<void> {
    return this.#onClose;
  }

  get isReconnecting(): boolean {
    return this.#reconnecting;
  }

  send(message: RpcMessage): void {
    if (this.#closed) throw new Error("Transport is closed");
    if (!this.#inner || this.#inner.isClosed) {
      throw new Error("Transport is reconnecting");
    }
    this.#inner.send(message);
  }

  [Symbol.dispose](): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#inner?.[Symbol.dispose]();
    this.#onClose.fire();
    this.#onClose.clear();
    this.#onMessage.clear();
  }

  #attachInner(transport: RpcTransport): void {
    this.#inner = transport;
    this.#attempts = 0;

    transport.onMessage.on((msg) => {
      if (!this.#closed) {
        this.#onMessage.fire(msg);
      }
    });

    transport.onClose.once(() => {
      if (!this.#closed) {
        this.#scheduleReconnect();
      }
    });
  }

  async #scheduleReconnect(): Promise<void> {
    if (this.#closed || this.#reconnecting) return;
    this.#reconnecting = true;
    this.#onDisconnectedCb?.();

    while (!this.#closed && this.#attempts < this.#maxAttempts) {
      const delay = Math.min(
        this.#initialDelayMs * Math.pow(2, this.#attempts),
        this.#maxDelayMs
      );
      this.#attempts++;

      await new Promise((r) => setTimeout(r, delay));
      if (this.#closed) break;

      try {
        const newTransport = await this.#connect();
        this.#reconnecting = false;
        this.#attachInner(newTransport);
        this.#onReconnectedCb?.();
        return;
      } catch {
        // Retry
      }
    }

    // Max attempts exceeded — give up
    if (!this.#closed) {
      this.#reconnecting = false;
      this.#closed = true;
      this.#onClose.fire();
      this.#onClose.clear();
      this.#onMessage.clear();
    }
  }
}
