/**
 * UpdateDelayer — strategy for pacing the update loop in ComputedState.
 *
 * Mirrors ActualLab.Fusion IUpdateDelayer + FixedDelayer:
 * - Controls how long to wait between invalidation and recomputation
 * - Built-in implementations: none (immediate), nextTick, fixed ms
 */

export interface UpdateDelayer {
  delay(retryCount: number, signal?: AbortSignal): Promise<void>;
}

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(signal.reason);
  if (ms <= 0) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      const onAbort = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

/** Fixed-duration delayer implementations. */
export const FixedDelayer = {
  /** Resolves immediately — no delay. */
  none: {
    delay(_retryCount: number, _signal?: AbortSignal): Promise<void> {
      return Promise.resolve();
    },
  } satisfies UpdateDelayer,

  /** Yields to the microtask queue (setTimeout(0)). */
  nextTick: {
    delay(_retryCount: number, signal?: AbortSignal): Promise<void> {
      return abortableDelay(0, signal);
    },
  } satisfies UpdateDelayer,

  /** Creates a delayer with a fixed delay in milliseconds. */
  ms(duration: number): UpdateDelayer {
    return {
      delay(_retryCount: number, signal?: AbortSignal): Promise<void> {
        return abortableDelay(duration, signal);
      },
    };
  },
} as const;
