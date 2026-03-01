/**
 * Invalidation — entry point for invalidation scopes.
 *
 * Mirrors ActualLab.Fusion Invalidation:
 * - begin() returns a disposable scope
 * - Within scope, @computed calls invalidate cached values rather than computing
 *
 * Usage:
 *   using _ = Invalidation.begin();
 *   this.getUser(userId); // invalidates, doesn't compute
 */

import { ComputeContext } from "./compute-context.js";

export const Invalidation = {
  /** Whether an invalidation scope is currently active. */
  get isActive(): boolean {
    return ComputeContext.isInvalidating;
  },

  /**
   * Begin an invalidation scope. Use with TC39 `using` declaration.
   *
   * Within this scope, any @computed method call will look up
   * the cached Computed and invalidate it (without executing the method).
   */
  begin(): Disposable {
    const prev = ComputeContext.enterInvalidating();
    return {
      [Symbol.dispose]() {
        ComputeContext.restore(prev);
      },
    };
  },
} as const;
