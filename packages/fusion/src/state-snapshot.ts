/**
 * StateSnapshot<T> — immutable snapshot of state at a point in time.
 *
 * Mirrors ActualLab.Fusion StateSnapshot:
 * - Tracks update count, error count, retry count
 * - Preserves last non-error computed for fallback values
 */

import type { Computed } from "./computed.js";

export class StateSnapshot<T> {
  readonly computed: Computed<T>;
  readonly lastNonErrorComputed: Computed<T> | undefined;
  readonly updateCount: number;
  readonly errorCount: number;
  readonly retryCount: number;

  constructor(
    computed: Computed<T>,
    prev?: StateSnapshot<T>
  ) {
    this.computed = computed;

    if (!prev) {
      // Initial snapshot
      this.updateCount = 0;
      this.errorCount = 0;
      this.retryCount = 0;
      this.lastNonErrorComputed = computed.output?.hasError ? undefined : computed;
      return;
    }

    this.updateCount = prev.updateCount + 1;

    if (computed.output && computed.output.hasError) {
      this.errorCount = prev.errorCount + 1;
      this.retryCount = prev.retryCount + 1;
      this.lastNonErrorComputed = prev.lastNonErrorComputed;
    } else {
      this.errorCount = prev.errorCount;
      this.retryCount = 0;
      this.lastNonErrorComputed = computed;
    }
  }

  get isInitial(): boolean {
    return this.updateCount === 0;
  }
}
