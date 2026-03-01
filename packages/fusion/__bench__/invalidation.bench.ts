import { describe, bench } from "vitest";
import { ComputedInput, Result } from "@fnodejs/core";
import { Computed } from "../src/index.js";

function createConsistentComputed(
  service: object,
  method: string,
  index: number
): Computed<number> {
  const input = new ComputedInput(service, method, [index]);
  const c = new Computed<number>(input);
  c.trySetOutput(Result.ok(index));
  return c;
}

describe("invalidation: linear chain", () => {
  const service = {};

  for (const size of [10, 100, 1000]) {
    bench(`linear chain (${size} nodes) — invalidate root`, () => {
      // Build chain: c0 ← c1 ← c2 ← ... ← cN-1
      const nodes: Computed<number>[] = [];
      for (let i = 0; i < size; i++) {
        nodes.push(createConsistentComputed(service, "chain", i));
      }
      // Wire dependencies: each node depends on the previous
      for (let i = 1; i < size; i++) {
        // Temporarily set to Computing to allow addDependency
        const input = new ComputedInput(service, "chain", [i]);
        const c = new Computed<number>(input);
        c.addDependency(nodes[i - 1]);
        c.trySetOutput(Result.ok(i));
        nodes[i] = c;
      }
      // Invalidate root — cascades through entire chain
      nodes[0].invalidate();
    });
  }
});

describe("invalidation: fan-out", () => {
  const service = {};

  for (const size of [10, 100, 1000]) {
    bench(`fan-out (1 root → ${size} dependants) — invalidate root`, () => {
      const root = createConsistentComputed(service, "root", 0);

      for (let i = 0; i < size; i++) {
        const input = new ComputedInput(service, "fan", [i]);
        const c = new Computed<number>(input);
        c.addDependency(root);
        c.trySetOutput(Result.ok(i));
      }

      root.invalidate();
    });
  }
});
