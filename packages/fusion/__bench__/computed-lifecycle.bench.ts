import { describe, bench, beforeEach } from "vitest";
import { ComputedInput, Result } from "@fnodejs/core";
import { Computed, ComputedRegistry, computed, capture } from "../src/index.js";

const service = { __fusionServiceId: "lifecycle" } as any;

describe("computed lifecycle", () => {
  beforeEach(() => {
    ComputedRegistry.clear();
  });

  bench("create + setOutput + register", () => {
    const input = new ComputedInput(service, "m", [Math.random()]);
    const c = new Computed<number>(input);
    c.trySetOutput(Result.ok(1));
    ComputedRegistry.register(c);
  });

  bench("cache hit + invalidate + re-register", () => {
    const input = new ComputedInput(service, "m", [0]);
    const c = new Computed<number>(input);
    c.trySetOutput(Result.ok(1));
    ComputedRegistry.register(c);
    // cache hit
    ComputedRegistry.get(input.key);
    // invalidate
    c.invalidate();
    // re-register fresh
    const c2 = new Computed<number>(input);
    c2.trySetOutput(Result.ok(2));
    ComputedRegistry.register(c2);
  });
});

describe("@computed method lifecycle", () => {
  class Svc {
    @computed()
    async getValue(n: number): Promise<number> {
      return n * 2;
    }
  }

  const svc = new Svc();

  beforeEach(() => {
    ComputedRegistry.clear();
  });

  bench("cold call (no cache)", async () => {
    ComputedRegistry.clear();
    await svc.getValue(Math.random());
  });

  bench("hot call (cache hit)", async () => {
    await svc.getValue(42);
  });
});

describe("capture() + whenInvalidated()", () => {
  class Svc {
    #val = 0;

    @computed()
    async get(): Promise<number> {
      return this.#val;
    }

    set(v: number) {
      this.#val = v;
    }
  }

  const svc = new Svc();

  beforeEach(() => {
    ComputedRegistry.clear();
  });

  bench("capture() a @computed method", async () => {
    const cap = await capture(() => svc.get());
    cap.computed.invalidate();
  });
});
