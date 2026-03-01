/**
 * Concurrency stress tests for the computed engine.
 * Ported from ActualLab.Fusion.Tests ConcurrencyTest.cs
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ComputedRegistry, computed, Invalidation } from "../src/index.js";
import { MutableState } from "../src/mutable-state.js";
import { ComputedState } from "../src/computed-state.js";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  ComputedRegistry.clear();
});

describe("Concurrency", () => {
  it("MutableState concurrent updates: converges to final value", async () => {
    const mutable = new MutableState(0);

    using state = new ComputedState(async () => {
      return mutable.use();
    });

    await delay(10);

    // Rapidly set values 1..100
    for (let i = 1; i <= 100; i++) {
      mutable.value = i;
    }

    // Wait for ComputedState to converge
    await delay(100);

    expect(state.value).toBe(100);
    mutable[Symbol.dispose]();
  });

  it("multiple ComputedStates watching same MutableState converge", async () => {
    const mutable = new MutableState(0);

    const states = Array.from({ length: 5 }, () =>
      new ComputedState(async () => mutable.use())
    );

    await delay(10);

    mutable.value = 42;
    await delay(100);

    for (const s of states) {
      expect(s.value).toBe(42);
    }

    // Cleanup
    for (const s of states) {
      s[Symbol.dispose]();
    }
    mutable[Symbol.dispose]();
  });

  it("concurrent capture of same @computed method returns same value", async () => {
    let computeCount = 0;
    class SharedService {
      @computed()
      async getValue(): Promise<number> {
        computeCount++;
        await delay(30);
        return 99;
      }
    }

    const svc = new SharedService();
    const results = await Promise.all([
      svc.getValue(),
      svc.getValue(),
      svc.getValue(),
    ]);

    expect(results).toEqual([99, 99, 99]);
    // Lock-based dedup means only 1 actual computation
    expect(computeCount).toBe(1);
  });

  it("fan-out stress: 1 MutableState, 20 ComputedStates — all see final value", async () => {
    const mutable = new MutableState(0);

    const states = Array.from({ length: 20 }, () =>
      new ComputedState(async () => mutable.use() * 2)
    );

    await delay(20);

    // Rapid mutations
    for (let i = 1; i <= 50; i++) {
      mutable.value = i;
    }

    // Wait for all to converge
    await delay(200);

    for (const s of states) {
      expect(s.value).toBe(100); // 50 * 2
    }

    // Cleanup
    for (const s of states) {
      s[Symbol.dispose]();
    }
    mutable[Symbol.dispose]();
  });
});
