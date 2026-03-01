import { describe, it, expect, beforeEach } from "vitest";
import { ComputedRegistry, computed, Invalidation } from "../src/index.js";
import { ComputedState } from "../src/computed-state.js";
import { FixedDelayer } from "../src/update-delayer.js";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  ComputedRegistry.clear();
});

describe("ComputedState", () => {
  it("computes initial value", async () => {
    using state = new ComputedState(async () => 42);
    // Wait for initial computation
    await delay(10);
    expect(state.value).toBe(42);
    expect(state.snapshot.isInitial).toBe(false); // updateCount = 1 after first compute
  });

  it("auto-updates after invalidation", async () => {
    let counter = 0;
    using state = new ComputedState(async () => ++counter);

    await delay(10);
    expect(state.value).toBe(1);

    // Manually invalidate the computed
    state.snapshot.computed.invalidate();

    // Wait for recomputation
    await delay(10);
    expect(state.value).toBe(2);
  });

  it("fires onUpdated after recomputation", async () => {
    let counter = 0;
    using state = new ComputedState(async () => ++counter);

    await delay(10);

    const updated = new Promise<void>((resolve) => {
      state.onUpdated.once(() => resolve());
    });

    state.snapshot.computed.invalidate();
    await updated;

    expect(state.value).toBe(2);
  });

  it("fires onInvalidated when computed invalidates", async () => {
    using state = new ComputedState(async () => 42);
    await delay(10);

    const invalidated = new Promise<void>((resolve) => {
      state.onInvalidated.once(() => resolve());
    });

    state.snapshot.computed.invalidate();
    await invalidated;
  });

  it("fires onUpdating before recomputation", async () => {
    let counter = 0;
    using state = new ComputedState(async () => ++counter);
    await delay(10);

    const updating = new Promise<boolean>((resolve) => {
      state.onUpdating.once(() => resolve(state.isUpdating));
    });

    state.snapshot.computed.invalidate();
    const wasUpdating = await updating;
    expect(wasUpdating).toBe(true);
  });

  it("handles errors and tracks retryCount", async () => {
    let callCount = 0;
    using state = new ComputedState(async () => {
      callCount++;
      if (callCount <= 2) throw new Error(`fail ${callCount}`);
      return 42;
    });

    // First call fails
    await delay(10);
    expect(state.error).toBeDefined();
    expect(state.snapshot.retryCount).toBe(1);

    // Invalidate — second call also fails
    state.snapshot.computed.invalidate();
    await delay(10);
    expect(state.error).toBeDefined();
    expect(state.snapshot.retryCount).toBe(2);

    // Invalidate — third call succeeds
    state.snapshot.computed.invalidate();
    await delay(10);
    expect(state.value).toBe(42);
    expect(state.snapshot.retryCount).toBe(0);
    expect(state.error).toBeUndefined();
  });

  it("preserves lastNonErrorComputed on error", async () => {
    let callCount = 0;
    using state = new ComputedState(async () => {
      callCount++;
      if (callCount === 2) throw new Error("transient");
      return callCount * 10;
    });

    await delay(10);
    expect(state.value).toBe(10);
    const firstGood = state.snapshot.computed;

    // Invalidate — triggers error
    state.snapshot.computed.invalidate();
    await delay(10);
    expect(state.error).toBeDefined();
    expect(state.snapshot.lastNonErrorComputed).toBe(firstGood);
  });

  it("respects updateDelayer", async () => {
    let counter = 0;
    using state = new ComputedState(async () => ++counter, {
      updateDelayer: FixedDelayer.ms(50),
    });

    await delay(10);
    expect(state.value).toBe(1);

    state.snapshot.computed.invalidate();

    // Should not have recomputed yet (50ms delay)
    await delay(20);
    expect(state.value).toBe(1);

    // After delay completes
    await delay(50);
    expect(state.value).toBe(2);
  });

  it("disposal stops the update loop", async () => {
    let counter = 0;
    const state = new ComputedState(async () => ++counter);

    await delay(10);
    expect(state.value).toBe(1);

    state[Symbol.dispose]();
    expect(state.isDisposed).toBe(true);

    // Invalidation should not cause recomputation
    state.snapshot.computed.invalidate();
    await delay(20);
    expect(state.snapshot.computed.output?.valueOrDefault).toBe(1);
  });

  it("tracks dependencies on @computed methods", async () => {
    let sourceValue = "hello";

    class DataService {
      @computed()
      async getData(): Promise<string> {
        return sourceValue;
      }
    }

    const svc = new DataService();

    using state = new ComputedState(async () => {
      return await svc.getData();
    });

    await delay(10);
    expect(state.value).toBe("hello");

    // Invalidate the source @computed
    sourceValue = "world";
    {
      using _ = Invalidation.begin();
      await svc.getData();
    }

    // ComputedState should recompute since its dependency was invalidated
    await delay(20);
    expect(state.value).toBe("world");
  });
});
