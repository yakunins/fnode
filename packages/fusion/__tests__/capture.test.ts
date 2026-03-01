import { describe, it, expect, beforeEach } from "vitest";
import { ComputedInput, Result } from "@fnodejs/core";
import {
  Computed,
  ComputedRegistry,
  Invalidation,
  computed,
  capture,
} from "../src/index.js";
import { ConsistencyState } from "../src/consistency-state.js";

beforeEach(() => {
  ComputedRegistry.clear();
});

// --- Test service ---
class Counter {
  #values = new Map<string, number>();

  set(key: string, value: number): void {
    this.#values.set(key, value);
    using _ = Invalidation.begin();
    this.get(key);
  }

  @computed()
  async get(key: string): Promise<number> {
    return this.#values.get(key) ?? 0;
  }
}

class Summer {
  readonly #counter: Counter;
  constructor(counter: Counter) {
    this.#counter = counter;
  }

  @computed()
  async getSum(a: string, b: string): Promise<number> {
    const va = await this.#counter.get(a);
    const vb = await this.#counter.get(b);
    return va + vb;
  }
}

describe("capture()", () => {
  it("captures a computed and its value", async () => {
    const counter = new Counter();
    counter.set("x", 10);

    const c = await capture(() => counter.get("x"));
    expect(c.value).toBe(10);
    expect(c.computed).toBeInstanceOf(Computed);
    expect(c.computed.isConsistent).toBe(true);
  });

  it("whenInvalidated() resolves on invalidation", async () => {
    const counter = new Counter();
    counter.set("x", 5);

    const c = await capture(() => counter.get("x"));
    expect(c.value).toBe(5);

    // Start waiting before invalidating
    let resolved = false;
    const waiting = c.whenInvalidated().then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);

    // Invalidate
    counter.set("x", 42);

    await waiting;
    expect(resolved).toBe(true);
  });

  it("update() returns fresh computed after invalidation", async () => {
    const counter = new Counter();
    counter.set("x", 1);

    const c1 = await capture(() => counter.get("x"));
    expect(c1.value).toBe(1);

    counter.set("x", 2);
    await c1.whenInvalidated();

    const c2 = await c1.update();
    expect(c2.value).toBe(2);
    expect(c2.computed).not.toBe(c1.computed); // new instance
    expect(c2.computed.isConsistent).toBe(true);
  });

  it("captures cross-service dependency (watch total)", async () => {
    const counter = new Counter();
    const summer = new Summer(counter);
    counter.set("a", 3);
    counter.set("b", 7);

    const c = await capture(() => summer.getSum("a", "b"));
    expect(c.value).toBe(10);

    // Change a dependency — should invalidate the sum
    counter.set("a", 100);
    await c.whenInvalidated();

    const c2 = await c.update();
    expect(c2.value).toBe(107);
  });

  it("throws if no @computed method called inside", async () => {
    await expect(capture(async () => 42)).rejects.toThrow(
      "no @computed method was called"
    );
  });
});

describe("Computed.whenInvalidated()", () => {
  it("resolves immediately if already invalidated", async () => {
    const input = new ComputedInput({}, "test", []);
    const comp = new Computed<number>(input);
    comp.trySetOutput(Result.ok(1));
    comp.invalidate();

    // Should resolve immediately
    await comp.whenInvalidated();
  });

  it("resolves when invalidated later", async () => {
    const input = new ComputedInput({}, "test", []);
    const comp = new Computed<number>(input);
    comp.trySetOutput(Result.ok(1));

    const promise = comp.whenInvalidated();

    comp.invalidate();
    // Should resolve now that it's invalidated
    await promise;
  });
});
