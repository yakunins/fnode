import { describe, bench, beforeEach } from "vitest";
import { ComputedInput, Result } from "@fnode/core";
import { Computed, ComputedRegistry } from "../src/index.js";

const service = {};

function populateRegistry(size: number): Computed<number>[] {
  const entries: Computed<number>[] = [];
  for (let i = 0; i < size; i++) {
    const input = new ComputedInput(service, "method", [i]);
    const c = new Computed<number>(input);
    c.trySetOutput(Result.ok(i));
    ComputedRegistry.register(c);
    entries.push(c);
  }
  return entries;
}

describe("ComputedRegistry operations", () => {
  for (const size of [100, 1000, 10000]) {
    describe(`registry size = ${size}`, () => {
      let entries: Computed<number>[];
      let hitKey: string;
      let missKey: string;

      beforeEach(() => {
        ComputedRegistry.clear();
        entries = populateRegistry(size);
        hitKey = entries[Math.floor(size / 2)].input.key;
        missKey = new ComputedInput(service, "missing", [999999]).key;
      });

      bench("get() hit (consistent)", () => {
        ComputedRegistry.get(hitKey);
      });

      bench("get() miss", () => {
        ComputedRegistry.get(missKey);
      });

      bench("get() stale (invalidated, triggers lazy delete)", () => {
        // Invalidate the middle entry and look it up
        const idx = Math.floor(size / 2);
        entries[idx].invalidate();
        ComputedRegistry.get(entries[idx].input.key);
        // Re-add for next iteration
        const input = new ComputedInput(service, "method", [idx]);
        const c = new Computed<number>(input);
        c.trySetOutput(Result.ok(idx));
        ComputedRegistry.register(c);
        entries[idx] = c;
      });

      bench("register() + unregister() cycle", () => {
        const input = new ComputedInput(service, "cycle", [0]);
        const c = new Computed<number>(input);
        c.trySetOutput(Result.ok(0));
        ComputedRegistry.register(c);
        ComputedRegistry.unregister(c);
      });
    });
  }
});
