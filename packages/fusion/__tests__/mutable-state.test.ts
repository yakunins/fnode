import { describe, it, expect, beforeEach } from "vitest";
import { Result } from "@fnode/core";
import { ComputedRegistry, computed, Invalidation } from "../src/index.js";
import { MutableState } from "../src/mutable-state.js";
import { ComputedState } from "../src/computed-state.js";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  ComputedRegistry.clear();
});

describe("MutableState", () => {
  it("holds initial value", () => {
    using state = new MutableState(42);
    expect(state.value).toBe(42);
    expect(state.snapshot.isInitial).toBe(true);
  });

  it("set(value) triggers immediate recompute", () => {
    using state = new MutableState(1);
    state.value = 2;
    expect(state.value).toBe(2);
    expect(state.snapshot.updateCount).toBe(1);
  });

  it("set(Result) works", () => {
    using state = new MutableState(1);
    state.set(Result.ok(42));
    expect(state.value).toBe(42);
  });

  it("set(updater) pattern", () => {
    using state = new MutableState(10);
    state.set((prev) => Result.ok(prev.value + 5));
    expect(state.value).toBe(15);
  });

  it("fires onInvalidated on set", () => {
    using state = new MutableState(1);
    let fired = false;
    state.onInvalidated.on(() => {
      fired = true;
    });

    state.value = 2;
    expect(fired).toBe(true);
  });

  it("fires onUpdating and onUpdated on set", () => {
    using state = new MutableState(1);
    const events: string[] = [];

    state.onUpdating.on(() => events.push("updating"));
    state.onUpdated.on(() => events.push("updated"));

    state.value = 2;
    expect(events).toEqual(["updating", "updated"]);
  });

  it("tracks error state", () => {
    using state = new MutableState(1);
    state.set(Result.err(new Error("boom")));

    expect(state.error).toBeDefined();
    expect(state.error!.message).toBe("boom");
    expect(state.snapshot.errorCount).toBe(1);
    expect(state.snapshot.retryCount).toBe(1);
  });

  it("preserves lastNonErrorComputed on error", () => {
    using state = new MutableState(42);
    const firstComputed = state.snapshot.computed;

    state.set(Result.err(new Error("fail")));
    expect(state.snapshot.lastNonErrorComputed).toBe(firstComputed);
  });

  it("resets retryCount on success after error", () => {
    using state = new MutableState(1);
    state.set(Result.err(new Error("fail")));
    expect(state.snapshot.retryCount).toBe(1);

    state.value = 42;
    expect(state.snapshot.retryCount).toBe(0);
    expect(state.value).toBe(42);
  });

  it("dependants recompute when mutable state changes", async () => {
    const mutable = new MutableState(10);

    using state = new ComputedState(async () => {
      return mutable.use() * 2;
    });

    await delay(10);
    expect(state.value).toBe(20);

    mutable.value = 25;

    // ComputedState should detect invalidation and recompute
    await delay(20);
    expect(state.value).toBe(50);

    mutable[Symbol.dispose]();
  });

  it("multiple rapid sets only keep last value", () => {
    using state = new MutableState(0);
    state.value = 1;
    state.value = 2;
    state.value = 3;
    expect(state.value).toBe(3);
    expect(state.snapshot.updateCount).toBe(3);
  });

  it("dispose invalidates current computed", () => {
    const state = new MutableState(42);
    const comp = state.snapshot.computed;
    expect(comp.isConsistent).toBe(true);

    state[Symbol.dispose]();
    expect(comp.isConsistent).toBe(false);
  });

  it("set after dispose still works (no crash)", () => {
    const state = new MutableState(1);
    state[Symbol.dispose]();

    // Setting after dispose — implementation-dependent behavior
    // The key assertion is that it doesn't crash
    expect(() => {
      state.value = 99;
    }).not.toThrow();
  });

  it("set same value still triggers invalidation (no skip-if-equal)", () => {
    // FNode MutableState does NOT have skip-if-equal optimization (unlike .NET)
    using state = new MutableState(42);
    let invalidated = false;
    state.onInvalidated.on(() => {
      invalidated = true;
    });

    state.value = 42; // same value
    // FNode always invalidates on set — documenting this difference from .NET
    expect(invalidated).toBe(true);
    expect(state.snapshot.updateCount).toBe(1);
  });
});
