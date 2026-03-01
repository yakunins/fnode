/**
 * useComputed — React hook for consuming a computed value.
 *
 * Creates a ComputedState internally, subscribes to updates,
 * and re-renders when the computed value changes.
 */

import { useMemo, useState, useEffect } from "react";
import { ComputedState, type ComputedStateOptions } from "@fnode/fusion";
import { FixedDelayer } from "@fnode/fusion";

export interface UseComputedOptions {
  updateDelayMs?: number;
  initialValue?: unknown;
}

export function useComputed<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  options: UseComputedOptions = {}
): T | undefined {
  const [value, setValue] = useState<T | undefined>(
    options.initialValue as T | undefined
  );

  const state = useMemo(() => {
    const stateOptions: ComputedStateOptions = {};
    if (options.updateDelayMs !== undefined && options.updateDelayMs > 0) {
      stateOptions.updateDelayer = FixedDelayer.ms(options.updateDelayMs);
    }
    return new ComputedState<T>(async (_signal) => fn(), stateOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const sub = state.onUpdated.on(() => {
      if (state.error === undefined) {
        setValue(state.value);
      }
    });

    // Capture initial value if already computed
    if (!state.isUpdating && state.error === undefined) {
      try {
        setValue(state.value);
      } catch {
        // Still computing
      }
    }

    return () => {
      sub[Symbol.dispose]();
      state[Symbol.dispose]();
    };
  }, [state]);

  return value;
}
