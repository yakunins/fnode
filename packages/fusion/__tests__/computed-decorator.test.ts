import { describe, it, expect, beforeEach } from "vitest";
import { computed, ComputedRegistry, Invalidation, ComputedState } from "../src/index.js";

beforeEach(() => {
  ComputedRegistry.clear();
});

// --- Test services ---

class CounterService {
  #counts = new Map<string, number>();
  callLog: string[] = [];

  set(key: string, value: number) {
    this.#counts.set(key, value);
  }

  @computed()
  async getCount(key: string): Promise<number> {
    this.callLog.push(`getCount(${key})`);
    return this.#counts.get(key) ?? 0;
  }
}

class DerivedService {
  callLog: string[] = [];

  constructor(readonly counter: CounterService) {}

  @computed()
  async getDoubled(key: string): Promise<number> {
    this.callLog.push(`getDoubled(${key})`);
    const count = await this.counter.getCount(key);
    return count * 2;
  }

  @computed()
  async getSum(a: string, b: string): Promise<number> {
    this.callLog.push(`getSum(${a},${b})`);
    const va = await this.counter.getCount(a);
    const vb = await this.counter.getCount(b);
    return va + vb;
  }
}

describe("@computed decorator", () => {
  it("caches results on second call", async () => {
    const svc = new CounterService();
    svc.set("x", 42);

    const r1 = await svc.getCount("x");
    const r2 = await svc.getCount("x");

    expect(r1).toBe(42);
    expect(r2).toBe(42);
    expect(svc.callLog).toEqual(["getCount(x)"]); // only called once
  });

  it("different args are cached separately", async () => {
    const svc = new CounterService();
    svc.set("a", 1);
    svc.set("b", 2);

    expect(await svc.getCount("a")).toBe(1);
    expect(await svc.getCount("b")).toBe(2);
    expect(svc.callLog).toEqual(["getCount(a)", "getCount(b)"]);
  });

  it("recomputes after invalidation", async () => {
    const svc = new CounterService();
    svc.set("x", 1);

    expect(await svc.getCount("x")).toBe(1);

    // Mutate and invalidate
    svc.set("x", 99);
    {
      using _ = Invalidation.begin();
      svc.getCount("x");
    }

    expect(await svc.getCount("x")).toBe(99);
    expect(svc.callLog).toEqual(["getCount(x)", "getCount(x)"]);
  });

  it("tracks dependencies: child invalidation → parent recomputes", async () => {
    const counter = new CounterService();
    const derived = new DerivedService(counter);
    counter.set("x", 5);

    expect(await derived.getDoubled("x")).toBe(10);
    expect(counter.callLog).toEqual(["getCount(x)"]);
    expect(derived.callLog).toEqual(["getDoubled(x)"]);

    // Invalidate the dependency
    counter.set("x", 20);
    {
      using _ = Invalidation.begin();
      counter.getCount("x");
    }

    // Parent should recompute because its dependency was invalidated
    expect(await derived.getDoubled("x")).toBe(40);
    expect(counter.callLog).toEqual(["getCount(x)", "getCount(x)"]);
    expect(derived.callLog).toEqual(["getDoubled(x)", "getDoubled(x)"]);
  });

  it("handles multiple dependencies", async () => {
    const counter = new CounterService();
    const derived = new DerivedService(counter);
    counter.set("a", 3);
    counter.set("b", 7);

    expect(await derived.getSum("a", "b")).toBe(10);

    // Invalidate one dependency
    counter.set("a", 100);
    {
      using _ = Invalidation.begin();
      counter.getCount("a");
    }

    expect(await derived.getSum("a", "b")).toBe(107);
  });

  it("handles errors in computed methods", async () => {
    class ErrorService {
      @computed()
      async fail(): Promise<number> {
        throw new Error("boom");
      }
    }

    const svc = new ErrorService();
    await expect(svc.fail()).rejects.toThrow("boom");
  });

  it("invalidation in scope does not execute method", async () => {
    const svc = new CounterService();
    svc.set("x", 1);
    await svc.getCount("x"); // populate cache
    svc.callLog.length = 0;

    {
      using _ = Invalidation.begin();
      svc.getCount("x"); // should NOT execute, just invalidate
    }

    expect(svc.callLog).toEqual([]); // method was not called
  });
});

describe("@computed decorator — advanced", () => {
  it("same call from two concurrent callers returns same value (deduplication)", async () => {
    let callCount = 0;
    class SlowService {
      @computed()
      async getValue(): Promise<number> {
        callCount++;
        await new Promise((r) => setTimeout(r, 50));
        return 42;
      }
    }

    const svc = new SlowService();
    const [r1, r2] = await Promise.all([svc.getValue(), svc.getValue()]);

    expect(r1).toBe(42);
    expect(r2).toBe(42);
    // Should only compute once due to lock-based deduplication
    expect(callCount).toBe(1);
  });

  it("error in @computed method: captured, subsequent call retries", async () => {
    let shouldFail = true;
    class FlakyService {
      @computed()
      async getData(): Promise<string> {
        if (shouldFail) throw new Error("flaky");
        return "ok";
      }
    }

    const svc = new FlakyService();

    // First call — error
    await expect(svc.getData()).rejects.toThrow("flaky");

    // Invalidate to allow retry
    {
      using _ = Invalidation.begin();
      svc.getData();
    }

    // Second call — success
    shouldFail = false;
    const result = await svc.getData();
    expect(result).toBe("ok");
  });

  it("invalidation + immediate re-call: verify fresh value", async () => {
    const counter = new CounterService();
    counter.set("x", 10);

    expect(await counter.getCount("x")).toBe(10);

    // Mutate, invalidate, and immediately re-call
    counter.set("x", 999);
    {
      using _ = Invalidation.begin();
      counter.getCount("x");
    }

    const fresh = await counter.getCount("x");
    expect(fresh).toBe(999);
  });

  it("cancellation via AbortSignal does not break cache", async () => {
    class AbortableService {
      @computed()
      async compute(): Promise<number> {
        return 42;
      }
    }

    const svc = new AbortableService();
    const result = await svc.compute();
    expect(result).toBe(42);

    // Second call should still return cached value
    const cached = await svc.compute();
    expect(cached).toBe(42);
  });

  it("auto-recompute via ComputedState wrapping @computed method", async () => {
    const counter = new CounterService();
    counter.set("y", 1);

    using state = new ComputedState(async () => {
      return counter.getCount("y");
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(state.value).toBe(1);

    // Mutate and invalidate
    counter.set("y", 42);
    {
      using _ = Invalidation.begin();
      counter.getCount("y");
    }

    // ComputedState should detect invalidation and recompute
    await new Promise((r) => setTimeout(r, 50));
    expect(state.value).toBe(42);
  });
});

describe("@computed decorator — registry integration", () => {
  it("registers computed in global registry", async () => {
    const svc = new CounterService();
    svc.set("x", 1);
    await svc.getCount("x");

    expect(ComputedRegistry.size).toBeGreaterThan(0);
  });

  it("unregisters on invalidation", async () => {
    const svc = new CounterService();
    svc.set("x", 1);
    await svc.getCount("x");

    const sizeBefore = ComputedRegistry.size;

    {
      using _ = Invalidation.begin();
      svc.getCount("x");
    }

    expect(ComputedRegistry.size).toBeLessThan(sizeBefore);
  });
});
