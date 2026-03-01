/**
 * Result<T> — immutable value/error container.
 *
 * Mirrors ActualLab.Core Result<T>:
 * - Success: holds a value of type T
 * - Error: holds an Error instance
 * - Accessing .value on an error result throws the error
 */

export class Result<T> {
  readonly #value: T | undefined;
  readonly #error: Error | undefined;

  private constructor(value: T | undefined, error: Error | undefined) {
    this.#value = value;
    this.#error = error;
  }

  static ok<T>(value: T): Result<T> {
    return new Result(value, undefined);
  }

  static err<T = never>(error: Error): Result<T> {
    return new Result<T>(undefined, error);
  }

  static from<T>(fn: () => T): Result<T> {
    try {
      return Result.ok(fn());
    } catch (e) {
      return Result.err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  static async fromAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
    try {
      return Result.ok(await fn());
    } catch (e) {
      return Result.err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  get hasValue(): boolean {
    return this.#error === undefined;
  }

  get hasError(): boolean {
    return this.#error !== undefined;
  }

  /** Returns the value or throws the error. */
  get value(): T {
    if (this.#error !== undefined) {
      throw this.#error;
    }
    return this.#value as T;
  }

  /** Returns the value or undefined if error. */
  get valueOrDefault(): T | undefined {
    return this.#value;
  }

  /** Returns the error or undefined if success. */
  get error(): Error | undefined {
    return this.#error;
  }
}
