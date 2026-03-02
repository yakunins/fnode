/**
 * Computed<T> — cached computation result with dependency tracking.
 *
 * Mirrors ActualLab.Fusion Computed<T>:
 * - States: Computing → Consistent → Invalidated
 * - Tracks dependencies (what this depends on) and dependants (what depends on this)
 * - Transitive invalidation: invalidating this invalidates all dependants
 * - Event: onInvalidated fires once when transitioning to Invalidated
 */

import { Result, TypedEvent, type ComputedInput } from "@fnodejs/core";
import { ConsistencyState } from "./consistency-state.js";
import { ComputeContext } from "./compute-context.js";

let nextVersion = 1;

export interface ComputedOptions {
  /** Auto-invalidate after this many ms. 0 = disabled. */
  autoInvalidateMs?: number;
  /** Cache hits return T directly (not Promise<T>). Default: false. */
  sync?: boolean;
}

export class Computed<T> {
  readonly input: ComputedInput;
  readonly version: number;
  readonly options: ComputedOptions;

  #state: ConsistencyState = ConsistencyState.Computing;
  #output: Result<T> | undefined;
  #invalidateOnSetOutput = false;

  /** What this computed depends on. */
  readonly #dependencies = new Set<Computed<unknown>>();
  /** What depends on this computed. */
  #dependants = new Set<Computed<unknown>>();

  readonly #onInvalidated = new TypedEvent<Computed<T>>();

  #autoInvalidateTimer: ReturnType<typeof setTimeout> | undefined;
  #invalidateCallback: (() => void) | undefined;

  constructor(input: ComputedInput, options: ComputedOptions = {}) {
    this.input = input;
    this.version = nextVersion++;
    this.options = options;
  }

  // --- State ---

  get state(): ConsistencyState {
    return this.#state;
  }

  get isConsistent(): boolean {
    return this.#state === ConsistencyState.Consistent;
  }

  // --- Output ---

  get output(): Result<T> | undefined {
    return this.#output;
  }

  /** Returns the value, or throws the error. Throws if still computing. */
  get value(): T {
    if (this.#output === undefined) {
      throw new Error("Computed is still computing");
    }
    return this.#output.value;
  }

  // --- Events ---

  get onInvalidated(): TypedEvent<Computed<T>> {
    return this.#onInvalidated;
  }

  setInvalidateCallback(cb: () => void): void {
    this.#invalidateCallback = cb;
  }

  // --- Dependencies ---

  get dependencyCount(): number {
    return this.#dependencies.size;
  }

  get dependantCount(): number {
    return this.#dependants.size;
  }

  /**
   * Register a dependency: this computed depends on `dependency`.
   * Called automatically by ComputeContext during computation.
   */
  addDependency(dependency: Computed<unknown>): void {
    if (this.#state !== ConsistencyState.Computing) return;
    this.#dependencies.add(dependency);
    dependency.#addDependant(this);
  }

  #addDependant(dependant: Computed<unknown>): void {
    if (this.#state === ConsistencyState.Invalidated) {
      // Dependency already invalid — force-invalidate dependant immediately
      // (bypass the defer-during-Computing logic)
      dependant.#forceInvalidate();
      return;
    }
    this.#dependants.add(dependant);
  }

  // --- Lifecycle ---

  /**
   * Set the output and transition to Consistent.
   * Returns false if not in Computing state.
   */
  trySetOutput(output: Result<T>): boolean {
    if (this.#state !== ConsistencyState.Computing) return false;

    this.#output = output;
    this.#state = ConsistencyState.Consistent;

    // If invalidation was requested during computation, apply it now
    if (this.#invalidateOnSetOutput) {
      this.#invalidateOnSetOutput = false;
      this.invalidate();
      return true;
    }

    // Start auto-invalidation timer if configured
    if (this.options.autoInvalidateMs && this.options.autoInvalidateMs > 0) {
      this.#autoInvalidateTimer = setTimeout(() => {
        this.invalidate();
      }, this.options.autoInvalidateMs);
    }

    return true;
  }

  /**
   * Force invalidation regardless of current state.
   * Used when a dependency is already invalid at the time a dependant tries to register.
   */
  #forceInvalidate(): void {
    if (this.#state === ConsistencyState.Invalidated) return;
    this.#state = ConsistencyState.Invalidated;

    if (this.#autoInvalidateTimer !== undefined) {
      clearTimeout(this.#autoInvalidateTimer);
      this.#autoInvalidateTimer = undefined;
    }

    // Direct callback (registry unregister) — no event overhead
    const cb = this.#invalidateCallback;
    if (cb) {
      this.#invalidateCallback = undefined;
      cb();
    }

    for (const dep of this.#dependencies) {
      dep.#dependants.delete(this);
    }
    this.#dependencies.clear();

    // Cascade to dependants (swap set to avoid array spread)
    if (this.#dependants.size > 0) {
      const deps = this.#dependants;
      this.#dependants = new Set();
      for (const dep of deps) {
        dep.invalidate();
      }
    }

    // Fire event AFTER cascade — for external subscribers
    this.#onInvalidated.fire(this);
    this.#onInvalidated.clear();
  }

  /**
   * Invalidate this computed. Cascades to all dependants.
   */
  invalidate(): void {
    if (this.#state === ConsistencyState.Invalidated) return;

    if (this.#state === ConsistencyState.Computing) {
      // Defer invalidation until output is set
      this.#invalidateOnSetOutput = true;
      return;
    }

    // Consistent → Invalidated
    this.#state = ConsistencyState.Invalidated;

    // Cancel auto-invalidation timer
    if (this.#autoInvalidateTimer !== undefined) {
      clearTimeout(this.#autoInvalidateTimer);
      this.#autoInvalidateTimer = undefined;
    }

    // Direct callback (registry unregister) — no event overhead
    const cb = this.#invalidateCallback;
    if (cb) {
      this.#invalidateCallback = undefined;
      cb();
    }

    // Remove self from all dependencies' dependant lists
    for (const dep of this.#dependencies) {
      dep.#dependants.delete(this);
    }
    this.#dependencies.clear();

    // Cascade to dependants (swap set to avoid array spread)
    if (this.#dependants.size > 0) {
      const deps = this.#dependants;
      this.#dependants = new Set();
      for (const dep of deps) {
        dep.invalidate();
      }
    }

    // Fire event AFTER cascade — for external subscribers
    this.#onInvalidated.fire(this);
    this.#onInvalidated.clear();
  }

  // --- Use in computation context ---

  /**
   * Returns a promise that resolves when this computed is invalidated.
   * Resolves immediately if already invalidated.
   */
  whenInvalidated(): Promise<void> {
    if (this.#state === ConsistencyState.Invalidated) {
      return Promise.resolve();
    }
    return this.#onInvalidated.next().then(() => {});
  }

  /**
   * Use this computed's value within a computation context.
   * Registers as dependency of the currently computing parent.
   */
  use(): T {
    const context = ComputeContext.current;
    if (context?.computed) {
      context.computed.addDependency(this);
    }
    return this.value;
  }
}
