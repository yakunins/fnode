import { describe, bench, beforeEach } from "vitest";
import { AsyncLocalStorage } from "node:async_hooks";
import { computed, ComputedRegistry } from "../src/index.js";

// --- Service with @computed methods ---

class TestService {
  @computed()
  async getZeroArg(): Promise<number> {
    return 42;
  }

  @computed()
  async getNumericArg(n: number): Promise<number> {
    return n * 2;
  }

  @computed()
  async getObjectArg(obj: { id: number }): Promise<number> {
    return obj.id;
  }
}

// --- Baselines ---

class PlainService {
  async getZeroArg(): Promise<number> {
    return 42;
  }

  async getNumericArg(n: number): Promise<number> {
    return n * 2;
  }

  async getObjectArg(obj: { id: number }): Promise<number> {
    return obj.id;
  }
}

// --- Benchmarks ---

describe("@computed cache hit vs plain async", () => {
  const svc = new TestService();
  const plain = new PlainService();

  beforeEach(() => {
    ComputedRegistry.clear();
  });

  bench("baseline: plain async method (zero-arg)", async () => {
    await plain.getZeroArg();
  });

  bench("@computed cache hit (zero-arg)", async () => {
    await svc.getZeroArg();
  });

  bench("baseline: plain async method (1 numeric arg)", async () => {
    await plain.getNumericArg(42);
  });

  bench("@computed cache hit (1 numeric arg)", async () => {
    await svc.getNumericArg(42);
  });

  bench("baseline: plain async method (1 object arg)", async () => {
    await plain.getObjectArg({ id: 1 });
  });

  bench("@computed cache hit (1 object arg)", async () => {
    await svc.getObjectArg({ id: 1 });
  });
});

describe("AsyncLocalStorage overhead", () => {
  const storage = new AsyncLocalStorage<{ value: number }>();

  bench("getStore() outside context", () => {
    storage.getStore();
  });

  bench("getStore() inside context", () => {
    storage.run({ value: 1 }, () => {
      storage.getStore();
    });
  });
});
