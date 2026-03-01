import { describe, bench, beforeEach } from "vitest";
import { computed, ComputedRegistry } from "../src/index.js";

class KeyValueService {
  #data = new Map<string, number>();

  constructor(keyCount: number) {
    for (let i = 0; i < keyCount; i++) {
      this.#data.set(`key-${i}`, i);
    }
  }

  @computed()
  async get(key: string): Promise<number> {
    return this.#data.get(key) ?? -1;
  }

  set(key: string, value: number) {
    this.#data.set(key, value);
  }
}

// Baseline: plain Map cache (no reactivity)
class PlainCacheService {
  #data = new Map<string, number>();
  #cache = new Map<string, number>();

  constructor(keyCount: number) {
    for (let i = 0; i < keyCount; i++) {
      this.#data.set(`key-${i}`, i);
      this.#cache.set(`key-${i}`, i);
    }
  }

  async get(key: string): Promise<number> {
    const cached = this.#cache.get(key);
    if (cached !== undefined) return cached;
    const v = this.#data.get(key) ?? -1;
    this.#cache.set(key, v);
    return v;
  }
}

for (const keyCount of [100, 1000]) {
  describe(`throughput (${keyCount} keys)`, () => {
    const svc = new KeyValueService(keyCount);
    const plainSvc = new PlainCacheService(keyCount);
    const keys = Array.from({ length: keyCount }, (_, i) => `key-${i}`);
    let idx = 0;

    beforeEach(() => {
      ComputedRegistry.clear();
      idx = 0;
    });

    bench("@computed reads (0% invalidation)", async () => {
      await svc.get(keys[idx++ % keyCount]);
    });

    bench("@computed reads (1% invalidation)", async () => {
      const key = keys[idx++ % keyCount];
      if (idx % 100 === 0) {
        // force invalidation by clearing registry entry
        ComputedRegistry.clear();
      }
      await svc.get(key);
    });

    bench("@computed reads (10% invalidation)", async () => {
      const key = keys[idx++ % keyCount];
      if (idx % 10 === 0) {
        ComputedRegistry.clear();
      }
      await svc.get(key);
    });

    bench("baseline: plain Map cache reads", async () => {
      await plainSvc.get(keys[idx++ % keyCount]);
    });
  });
}
