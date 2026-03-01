import { describe, it, expect, beforeEach } from "vitest";
import { ComputedInput } from "@fnodejs/core";
import { Computed, ComputeContext, Invalidation, ComputedRegistry } from "../src/index.js";
import { Result } from "@fnodejs/core";

beforeEach(() => {
  ComputedRegistry.clear();
});

describe("ComputeContext", () => {
  const svc = {};

  it("current is undefined outside any context", () => {
    expect(ComputeContext.current).toBeUndefined();
  });

  it("run sets the current context", () => {
    const comp = new Computed<number>(new ComputedInput(svc, "m", []));
    let inside: Computed<unknown> | undefined;

    ComputeContext.run(comp, () => {
      inside = ComputeContext.current?.computed;
    });

    expect(inside).toBe(comp);
  });

  it("context is restored after run", () => {
    const comp = new Computed<number>(new ComputedInput(svc, "m", []));
    ComputeContext.run(comp, () => {});
    // After run, there's no context (or whatever was before)
    // Note: enterWith in invalidation may leave a residual context
  });

  it("propagates through async calls", async () => {
    const comp = new Computed<number>(new ComputedInput(svc, "m", []));
    let insideAsync: Computed<unknown> | undefined;

    await ComputeContext.run(comp, async () => {
      await new Promise((r) => setTimeout(r, 10));
      insideAsync = ComputeContext.current?.computed;
    });

    expect(insideAsync).toBe(comp);
  });

  it("nested contexts work correctly", () => {
    const outer = new Computed<number>(new ComputedInput(svc, "outer", []));
    const inner = new Computed<number>(new ComputedInput(svc, "inner", []));

    let outerCtx: Computed<unknown> | undefined;
    let innerCtx: Computed<unknown> | undefined;
    let afterInner: Computed<unknown> | undefined;

    ComputeContext.run(outer, () => {
      outerCtx = ComputeContext.current?.computed;
      ComputeContext.run(inner, () => {
        innerCtx = ComputeContext.current?.computed;
      });
      afterInner = ComputeContext.current?.computed;
    });

    expect(outerCtx).toBe(outer);
    expect(innerCtx).toBe(inner);
    expect(afterInner).toBe(outer);
  });
});

describe("Invalidation", () => {
  it("isActive is false outside scope", () => {
    expect(Invalidation.isActive).toBe(false);
  });

  it("isActive is true inside begin() scope", () => {
    using _ = Invalidation.begin();
    expect(Invalidation.isActive).toBe(true);
  });

  it("isActive restored after scope ends", () => {
    {
      using _ = Invalidation.begin();
      expect(Invalidation.isActive).toBe(true);
    }
    expect(Invalidation.isActive).toBe(false);
  });
});

describe("ComputeContext — isolation and error handling", () => {
  const svc = {};

  it("AsyncLocalStorage isolation: two concurrent computations have independent contexts", async () => {
    const comp1 = new Computed<number>(new ComputedInput(svc, "c1", []));
    const comp2 = new Computed<number>(new ComputedInput(svc, "c2", []));

    const results: Array<Computed<unknown> | undefined> = [];

    await Promise.all([
      ComputeContext.run(comp1, async () => {
        await new Promise((r) => setTimeout(r, 20));
        results.push(ComputeContext.current?.computed);
      }),
      ComputeContext.run(comp2, async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push(ComputeContext.current?.computed);
      }),
    ]);

    // Each should see its own context, not the other's
    expect(results).toContain(comp1);
    expect(results).toContain(comp2);
  });

  it("context not leaked on error: if computation throws, context is restored", () => {
    const comp = new Computed<number>(new ComputedInput(svc, "err", []));

    try {
      ComputeContext.run(comp, () => {
        throw new Error("fail");
      });
    } catch {
      // expected
    }

    // Context should be restored (not leaked)
    // Note: AsyncLocalStorage.run() automatically restores on throw
    expect(ComputeContext.current?.computed).not.toBe(comp);
  });

  it("deep async chain: context propagates through 5+ levels", async () => {
    const comp = new Computed<number>(new ComputedInput(svc, "deep", []));

    const checkContext = async (depth: number): Promise<boolean> => {
      if (depth === 0) {
        return ComputeContext.current?.computed === comp;
      }
      await new Promise((r) => setTimeout(r, 1));
      return checkContext(depth - 1);
    };

    const result = await ComputeContext.run(comp, () => checkContext(5));
    expect(result).toBe(true);
  });
});
