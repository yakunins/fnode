/**
 * useComputedState — React hook exposing the full computed state snapshot.
 *
 * Returns { value, error, isUpdating } and re-renders on each update.
 */

import { useMemo, useState, useEffect } from "react";
import { ComputedState, type ComputedStateOptions } from "@fnode/fusion";
import { FixedDelayer } from "@fnode/fusion";

export interface UseComputedStateOptions {
  updateDelayMs?: number;
}

export interface ComputedStateResult<T> {
  value: T | undefined;
  error: Error | undefined;
  isUpdating: boolean;
}

export function useComputedState<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  options: UseComputedStateOptions = {}
): ComputedStateResult<T> {
  const [result, setResult] = useState<ComputedStateResult<T>>({
    value: undefined,
    error: undefined,
    isUpdating: true,
  });

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
      setResult({
        value: state.error === undefined ? state.value : undefined,
        error: state.error,
        isUpdating: false,
      });
    });

    const updatingSub = state.onUpdating.on(() => {
      setResult((prev) => ({ ...prev, isUpdating: true }));
    });

    return () => {
      sub[Symbol.dispose]();
      updatingSub[Symbol.dispose]();
      state[Symbol.dispose]();
    };
  }, [state]);

  return result;
}
