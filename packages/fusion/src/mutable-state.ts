/**
 * MutableState<T> — synchronous set → immediate invalidate → recompute.
 *
 * Mirrors ActualLab.Fusion MutableState<T>:
 * - value getter/setter for direct mutation
 * - set(result) / set(updater) overloads
 * - Integrates into the computed dependency graph
 * - Same event surface as ComputedState
 */

import { TypedEvent, ComputedInput, Result } from "@fnode/core";
import { Computed } from "./computed.js";
import { ComputeContext } from "./compute-context.js";
import { StateSnapshot } from "./state-snapshot.js";

let nextMutableId = 1;

export class MutableState<T> {
  readonly #mutableId: number;
  #snapshot: StateSnapshot<T>;
  #currentResult: Result<T>;

  readonly onInvalidated = new TypedEvent<MutableState<T>>();
  readonly onUpdating = new TypedEvent<MutableState<T>>();
  readonly onUpdated = new TypedEvent<MutableState<T>>();

  constructor(initialValue: T) {
    this.#mutableId = nextMutableId++;
    this.#currentResult = Result.ok(initialValue);

    // Create the initial computed and set it as consistent
    const comp = this.#createComputed();
    comp.trySetOutput(this.#currentResult);
    this.#snapshot = new StateSnapshot(comp);
  }

  get snapshot(): StateSnapshot<T> {
    return this.#snapshot;
  }

  get value(): T {
    return this.#snapshot.computed.value;
  }

  set value(v: T) {
    this.set(Result.ok(v));
  }

  get error(): Error | undefined {
    return this.#snapshot.computed.output?.error;
  }

  /**
   * Set the state to a new result and immediately recompute.
   * Also accepts an updater function.
   */
  set(resultOrUpdater: Result<T> | ((prev: Result<T>) => Result<T>)): void {
    const newResult =
      typeof resultOrUpdater === "function"
        ? (resultOrUpdater as (prev: Result<T>) => Result<T>)(this.#currentResult)
        : resultOrUpdater;

    this.#currentResult = newResult;

    // Invalidate the current computed
    const prevComputed = this.#snapshot.computed;
    prevComputed.invalidate();

    this.onInvalidated.fire(this);
    this.onUpdating.fire(this);

    // Create new computed with the new result
    const comp = this.#createComputed();

    // Run in ComputeContext so dependencies are tracked
    ComputeContext.run(comp, () => {
      comp.trySetOutput(newResult);
    });

    this.#snapshot = new StateSnapshot(comp, this.#snapshot);
    this.onUpdated.fire(this);
  }

  #createComputed(): Computed<T> {
    const input = new ComputedInput(this, `mutable_${this.#mutableId}`, []);
    return new Computed<T>(input);
  }

  /**
   * Use this mutable state's value within a computation context.
   * Registers as a dependency of the currently computing parent.
   */
  use(): T {
    return this.#snapshot.computed.use();
  }

  [Symbol.dispose](): void {
    // Invalidate to notify dependants
    this.#snapshot.computed.invalidate();
  }
}
