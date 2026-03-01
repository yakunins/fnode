/**
 * AsyncLock — async-friendly mutex.
 *
 * Mirrors ActualLab.Core AsyncLock:
 * - Promise-based (like SemaphoreSlim(1,1) in .NET)
 * - Returns a disposable releaser for use with `using`
 * - No reentrancy support (single-threaded JS doesn't need it for most cases)
 */

export interface Releaser extends Disposable {
  [Symbol.dispose](): void;
}

export class AsyncLock {
  #locked = false;
  #queue: Array<() => void> = [];

  get isLocked(): boolean {
    return this.#locked;
  }

  async lock(): Promise<Releaser> {
    if (!this.#locked) {
      this.#locked = true;
      return this.#createReleaser();
    }

    await new Promise<void>((resolve) => {
      this.#queue.push(resolve);
    });

    return this.#createReleaser();
  }

  #release(): void {
    const next = this.#queue.shift();
    if (next) {
      next();
    } else {
      this.#locked = false;
    }
  }

  #createReleaser(): Releaser {
    let released = false;
    return {
      [Symbol.dispose]: () => {
        if (!released) {
          released = true;
          this.#release();
        }
      },
    };
  }
}
