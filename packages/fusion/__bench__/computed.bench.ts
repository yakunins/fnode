import { describe, bench } from "vitest";
import { computed, Invalidation, ComputedRegistry } from "../src/index.js";

// --- Helpers ---

class SimpleService {
  private value = 42;

  @computed()
  async get(): Promise<number> {
    return this.value;
  }

  @computed()
  async getWithArg(id: string): Promise<string> {
    return `${id}:${this.value}`;
  }

  setValue(v: number): void {
    this.value = v;
    using _ = Invalidation.begin();
    this.get();
  }
}

class ChainService {
  private base = 1;

  @computed()
  async level0(): Promise<number> {
    return this.base;
  }

  @computed()
  async level1(): Promise<number> {
    return (await this.level0()) + 1;
  }

  @computed()
  async level2(): Promise<number> {
    return (await this.level1()) + 1;
  }

  @computed()
  async level3(): Promise<number> {
    return (await this.level2()) + 1;
  }

  invalidateBase(): void {
    using _ = Invalidation.begin();
    this.level0();
  }
}

class FanOutService {
  private base = 0;

  @computed()
  async root(): Promise<number> {
    return this.base;
  }

  @computed()
  async leaf(id: number): Promise<number> {
    return (await this.root()) + id;
  }

  invalidateRoot(): void {
    using _ = Invalidation.begin();
    this.root();
  }
}

// --- Benchmarks ---

describe("@computed cache hit", () => {
  const svc = new SimpleService();

  bench("cached call (no args)", async () => {
    await svc.get();
  });

  bench("cached call (string arg)", async () => {
    await svc.getWithArg("item-1");
  });
});

describe("@computed cold compute", () => {
  bench("first call (no cache)", async () => {
    const svc = new SimpleService();
    await svc.get();
  });
});

describe("invalidation", () => {
  const svc = new SimpleService();

  bench("invalidate + recompute single", async () => {
    svc.setValue(Math.random());
    await svc.get();
  });
});

describe("transitive invalidation chain (depth=4)", () => {
  const chain = new ChainService();

  bench("invalidate base → recompute level3", async () => {
    chain.invalidateBase();
    await chain.level3();
  });
});

describe("fan-out invalidation", () => {
  const fan = new FanOutService();

  bench("invalidate root → recompute 100 leaves", async () => {
    fan.invalidateRoot();
    for (let i = 0; i < 100; i++) {
      await fan.leaf(i);
    }
  });
});

describe("ComputedRegistry lookup", () => {
  const svc = new SimpleService();

  bench("cache hit among 100 entries", async () => {
    await svc.getWithArg("key-50");
  });
});
