/**
 * AsyncLockSet<K> — keyed async lock (one lock per key).
 *
 * Mirrors ActualLab.Core AsyncLockSet<TKey>:
 * - Map<K, Entry> with per-key AsyncLock
 * - Reference counting: entries are removed when no longer in use
 * - Used by ComputedRegistry to prevent duplicate computation races
 */

import { AsyncLock, type Releaser } from "./async-lock.js";

interface Entry {
  lock: AsyncLock;
  useCount: number;
}

export class AsyncLockSet<K> {
  readonly #entries = new Map<K, Entry>();

  /** Number of active lock entries. */
  get size(): number {
    return this.#entries.size;
  }

  async lock(key: K): Promise<Releaser> {
    let entry = this.#entries.get(key);
    if (!entry) {
      entry = { lock: new AsyncLock(), useCount: 0 };
      this.#entries.set(key, entry);
    }
    entry.useCount++;

    const innerReleaser = await entry.lock.lock();

    let released = false;
    return {
      [Symbol.dispose]: () => {
        if (released) return;
        released = true;
        innerReleaser[Symbol.dispose]();
        entry!.useCount--;
        if (entry!.useCount === 0) {
          this.#entries.delete(key);
        }
      },
    };
  }
}
