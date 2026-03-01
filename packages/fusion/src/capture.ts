/**
 * capture() — runs an async function and returns the Computed it produced.
 *
 * Mirrors ActualLab.Fusion Computed.Capture():
 * - Executes fn within a capture context
 * - The @computed method called inside registers its Computed as a dependency
 * - Returns a CapturedComputed wrapper with value, whenInvalidated(), update()
 *
 * Usage:
 *   const c = await capture(() => cartService.getTotal("cart1"));
 *   console.log(c.value);           // current total
 *   await c.whenInvalidated();      // wait for dependency change
 *   const c2 = await c.update();    // recompute
 */

import type { Computed } from "./computed.js";
import { ComputeContext } from "./compute-context.js";

export interface CapturedComputed<T> {
  /** The underlying Computed instance. */
  readonly computed: Computed<T>;
  /** The computed value. */
  readonly value: T;
  /** Resolves when the computed is invalidated. */
  whenInvalidated(): Promise<void>;
  /** Re-runs the capture to get a fresh CapturedComputed. */
  update(): Promise<CapturedComputed<T>>;
}

/**
 * Run fn and capture the Computed produced by the @computed method inside.
 */
export async function capture<T>(
  fn: () => Promise<T>
): Promise<CapturedComputed<T>> {
  // Duck-typed proxy that captures dependencies without a real Computed
  const deps: Computed<unknown>[] = [];
  const captureProxy = {
    addDependency(dep: Computed<unknown>) {
      deps.push(dep);
    },
  };

  // Run fn within a capture context
  await ComputeContext.runRaw(
    { computed: captureProxy as any, invalidating: false },
    fn
  );

  if (deps.length === 0) {
    throw new Error("capture(): no @computed method was called inside fn");
  }

  const captured = deps[0] as Computed<T>;
  return {
    get computed() {
      return captured;
    },
    get value() {
      return captured.value;
    },
    whenInvalidated: () => captured.whenInvalidated(),
    update: () => capture(fn),
  };
}
