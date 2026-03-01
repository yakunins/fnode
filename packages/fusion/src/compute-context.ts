/**
 * ComputeContext — AsyncLocalStorage-backed context for dependency tracking.
 *
 * Mirrors ActualLab.Fusion ComputeContext:
 * - Tracks which Computed is currently being produced
 * - Propagates through async call chains via AsyncLocalStorage
 * - Modes: Normal (compute), Invalidating (invalidation scope)
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { Computed } from "./computed.js";

export interface ComputeContextData {
  /** The computed being produced, or undefined for invalidation/none context. */
  computed?: Computed<unknown>;
  /** Whether we're in an invalidation scope. */
  invalidating: boolean;
}

export class ComputeContext {
  static readonly #storage = new AsyncLocalStorage<ComputeContextData>();

  /** Get the current context, or undefined if none. */
  static get current(): ComputeContextData | undefined {
    return ComputeContext.#storage.getStore();
  }

  /** Whether we're currently in an invalidation scope. */
  static get isInvalidating(): boolean {
    return ComputeContext.#storage.getStore()?.invalidating === true;
  }

  /**
   * Run `fn` with a computation context for the given computed.
   * Any @computed calls within will register as dependencies.
   */
  static run<R>(computed: Computed<unknown>, fn: () => R): R {
    return ComputeContext.#storage.run(
      { computed, invalidating: false },
      fn
    );
  }

  /**
   * Run `fn` with raw context data (used by capture()).
   */
  static runRaw<R>(data: ComputeContextData, fn: () => R): R {
    return ComputeContext.#storage.run(data, fn);
  }

  /**
   * Enter an invalidation context for the current async scope.
   * Returns previous context data for restoration.
   */
  static enterInvalidating(): ComputeContextData | undefined {
    const prev = ComputeContext.#storage.getStore();
    ComputeContext.#storage.enterWith({ invalidating: true });
    return prev;
  }

  /**
   * Restore a previous context (used when exiting invalidation scope).
   */
  static restore(prev: ComputeContextData | undefined): void {
    if (prev) {
      ComputeContext.#storage.enterWith(prev);
    } else {
      // No way to "exit" enterWith — disable sets a neutral context
      ComputeContext.#storage.enterWith({ invalidating: false });
    }
  }
}
