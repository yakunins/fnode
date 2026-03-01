/**
 * TypedEvent<T> — minimal typed event with subscribe/fire.
 *
 * Not a full EventEmitter — just a single event with typed payload.
 * Mirrors the pattern used by Fusion's Computed.Invalidated event.
 */

export type EventHandler<T> = (value: T) => void;

export class TypedEvent<T> {
  #handlers: Set<EventHandler<T>> | undefined;

  get hasHandlers(): boolean {
    return this.#handlers !== undefined && this.#handlers.size > 0;
  }

  on(handler: EventHandler<T>): Disposable {
    if (!this.#handlers) {
      this.#handlers = new Set();
    }
    this.#handlers.add(handler);

    return {
      [Symbol.dispose]: () => {
        this.#handlers?.delete(handler);
      },
    };
  }

  once(handler: EventHandler<T>): Disposable {
    const wrapper: EventHandler<T> = (value) => {
      sub[Symbol.dispose]();
      handler(value);
    };
    const sub = this.on(wrapper);
    return sub;
  }

  fire(value: T): void {
    if (!this.#handlers) return;
    for (const handler of this.#handlers) {
      handler(value);
    }
  }

  /** Returns a promise that resolves on the next fire. */
  next(): Promise<T> {
    return new Promise<T>((resolve) => {
      this.once(resolve);
    });
  }

  clear(): void {
    this.#handlers?.clear();
  }
}
