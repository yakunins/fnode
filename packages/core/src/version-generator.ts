/**
 * VersionGenerator — monotonically increasing version counter.
 *
 * Mirrors ActualLab.Core VersionGenerator:
 * - Each call to next() returns a strictly increasing number
 * - Used by Computed<T> for version tracking
 */

export class VersionGenerator {
  #current = 0;

  get current(): number {
    return this.#current;
  }

  next(): number {
    return ++this.#current;
  }
}
