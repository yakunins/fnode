/**
 * useMutableState — React hook wrapping MutableState<T>.
 *
 * Returns [value, setter] similar to useState, but backed by
 * a MutableState that integrates into the computed dependency graph.
 */

import { useMemo, useState, useEffect, useCallback } from "react";
import { MutableState } from "@fnodejs/fusion";

export function useMutableState<T>(
  initialValue: T
): [T, (value: T) => void] {
  const mutable = useMemo(() => new MutableState(initialValue), []);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const sub = mutable.onUpdated.on(() => {
      if (mutable.error === undefined) {
        setValue(mutable.value);
      }
    });

    return () => {
      sub[Symbol.dispose]();
      mutable[Symbol.dispose]();
    };
  }, [mutable]);

  const setter = useCallback(
    (newValue: T) => {
      mutable.value = newValue;
    },
    [mutable]
  );

  return [value, setter];
}
