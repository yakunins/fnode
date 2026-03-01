/**
 * ComputedRegistry — global cache of all live Computed instances.
 *
 * Mirrors ActualLab.Fusion ComputedRegistry:
 * - Maps ComputedInput.key → Computed
 * - Weak references not needed (JS single-threaded, explicit invalidation removes entries)
 * - Provides get/register/unregister
 */

import { AsyncLockSet } from "@fnodejs/core";
import type { Computed } from "./computed.js";

class ComputedRegistryImpl {
  readonly #storage = new Map<string, Computed<unknown>>();
  readonly inputLocks = new AsyncLockSet<string>();

  get size(): number {
    return this.#storage.size;
  }

  get(key: string): Computed<unknown> | undefined {
    const existing = this.#storage.get(key);
    if (existing && existing.isConsistent) {
      return existing;
    }
    // Clean up invalidated entries on access
    if (existing) {
      this.#storage.delete(key);
    }
    return undefined;
  }

  register(computed: Computed<unknown>): void {
    const key = computed.input.key;
    const existing = this.#storage.get(key);
    if (existing && existing !== computed) {
      // Invalidate previous version
      existing.invalidate();
    }
    this.#storage.set(key, computed);
  }

  unregister(computed: Computed<unknown>): void {
    const key = computed.input.key;
    const current = this.#storage.get(key);
    // Only remove if it's the same instance (not a newer computation)
    if (current === computed) {
      this.#storage.delete(key);
    }
  }

  clear(): void {
    this.#storage.clear();
  }

  /** Invalidate and remove all entries — used after reconnection to flush stale caches. */
  invalidateAll(): void {
    const entries = [...this.#storage.values()];
    this.#storage.clear();
    for (const computed of entries) {
      computed.invalidate();
    }
  }
}

/** Global singleton registry. */
export const ComputedRegistry = new ComputedRegistryImpl();
