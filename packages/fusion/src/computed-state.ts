/**
 * ComputedState<T> — auto-updating reactive state driven by a compute function.
 *
 * Mirrors ActualLab.Fusion ComputedState<T>:
 * - Background loop: compute → whenInvalidated() → delay → recompute
 * - Exposes snapshot, value, error, isUpdating
 * - Events: onInvalidated, onUpdating, onUpdated
 * - Disposal via AbortController cancels the loop
 */

import { TypedEvent, ComputedInput, Result } from "@fnodejs/core";
import { Computed } from "./computed.js";
import { ComputeContext } from "./compute-context.js";
import { StateSnapshot } from "./state-snapshot.js";
import { FixedDelayer, type UpdateDelayer } from "./update-delayer.js";

export interface ComputedStateOptions {
  updateDelayer?: UpdateDelayer;
  /** Category label for debugging. */
  category?: string;
}

// Counter for unique service identity per ComputedState instance
let nextStateId = 1;

export class ComputedState<T> {
  readonly #computer: (signal: AbortSignal) => Promise<T>;
  readonly #updateDelayer: UpdateDelayer;
  readonly #abortController = new AbortController();
  readonly #stateId: number;

  #snapshot: StateSnapshot<T>;
  #isUpdating = false;
  #updateCyclePromise: Promise<void>;

  readonly onInvalidated = new TypedEvent<ComputedState<T>>();
  readonly onUpdating = new TypedEvent<ComputedState<T>>();
  readonly onUpdated = new TypedEvent<ComputedState<T>>();

  constructor(
    computer: (signal: AbortSignal) => Promise<T>,
    options: ComputedStateOptions = {}
  ) {
    this.#computer = computer;
    this.#updateDelayer = options.updateDelayer ?? FixedDelayer.none;
    this.#stateId = nextStateId++;

    // Create initial computing snapshot
    const initialInput = new ComputedInput(this, `state_${this.#stateId}`, []);
    const initialComputed = new Computed<T>(initialInput);
    this.#snapshot = new StateSnapshot(initialComputed);

    // Start the update cycle
    this.#updateCyclePromise = this.#updateCycle();
  }

  get snapshot(): StateSnapshot<T> {
    return this.#snapshot;
  }

  get value(): T {
    return this.#snapshot.computed.value;
  }

  get error(): Error | undefined {
    return this.#snapshot.computed.output?.error;
  }

  get isUpdating(): boolean {
    return this.#isUpdating;
  }

  get isDisposed(): boolean {
    return this.#abortController.signal.aborted;
  }

  /** Wait for the update cycle to finish (useful in tests). */
  get whenDisposed(): Promise<void> {
    return this.#updateCyclePromise;
  }

  async #updateCycle(): Promise<void> {
    const signal = this.#abortController.signal;

    try {
      // Initial computation
      await this.#compute(signal);

      while (!signal.aborted) {
        const snapshot = this.#snapshot;
        const current = snapshot.computed;

        // Wait for invalidation
        await current.whenInvalidated();
        if (signal.aborted) break;

        this.onInvalidated.fire(this);

        // Delay before recomputation
        try {
          await this.#updateDelayer.delay(snapshot.retryCount, signal);
        } catch {
          break; // Aborted during delay
        }

        if (signal.aborted) break;

        // Recompute
        await this.#compute(signal);
      }
    } catch {
      // Loop cancelled — expected on dispose
    }
  }

  async #compute(signal: AbortSignal): Promise<void> {
    this.#isUpdating = true;
    this.onUpdating.fire(this);

    const input = new ComputedInput(this, `state_${this.#stateId}`, []);
    const comp = new Computed<T>(input);

    const result = await ComputeContext.run(comp, async () => {
      try {
        const value = await this.#computer(signal);
        return Result.ok(value);
      } catch (e) {
        return Result.err(e instanceof Error ? e : new Error(String(e)));
      }
    });

    comp.trySetOutput(result);

    this.#snapshot = new StateSnapshot(comp, this.#snapshot);
    this.#isUpdating = false;
    this.onUpdated.fire(this);
  }

  [Symbol.dispose](): void {
    this.#abortController.abort();
  }
}
