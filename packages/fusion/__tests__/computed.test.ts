import { describe, it, expect, beforeEach } from "vitest";
import { ComputedInput } from "@fnodejs/core";
import { Computed, ConsistencyState, ComputedRegistry } from "../src/index.js";
import { Result } from "@fnodejs/core";

beforeEach(() => {
  ComputedRegistry.clear();
});

describe("Computed<T>", () => {
  const svc = {};

  function makeComputed<T>(method: string, args: unknown[] = []): Computed<T> {
    return new Computed<T>(new ComputedInput(svc, method, args));
  }

  it("starts in Computing state", () => {
    const c = makeComputed<number>("m");
    expect(c.state).toBe(ConsistencyState.Computing);
    expect(c.isConsistent).toBe(false);
  });

  it("transitions to Consistent on trySetOutput", () => {
    const c = makeComputed<number>("m");
    const ok = c.trySetOutput(Result.ok(42));
    expect(ok).toBe(true);
    expect(c.state).toBe(ConsistencyState.Consistent);
    expect(c.isConsistent).toBe(true);
    expect(c.value).toBe(42);
  });

  it("trySetOutput fails if not Computing", () => {
    const c = makeComputed<number>("m");
    c.trySetOutput(Result.ok(1));
    const ok = c.trySetOutput(Result.ok(2));
    expect(ok).toBe(false);
    expect(c.value).toBe(1);
  });

  it("transitions to Invalidated on invalidate", () => {
    const c = makeComputed<number>("m");
    c.trySetOutput(Result.ok(42));
    c.invalidate();
    expect(c.state).toBe(ConsistencyState.Invalidated);
  });

  it("invalidate is idempotent", () => {
    const c = makeComputed<number>("m");
    c.trySetOutput(Result.ok(42));
    c.invalidate();
    c.invalidate(); // should not throw
    expect(c.state).toBe(ConsistencyState.Invalidated);
  });

  it("fires onInvalidated event", () => {
    const c = makeComputed<number>("m");
    c.trySetOutput(Result.ok(42));

    let fired = false;
    c.onInvalidated.on(() => {
      fired = true;
    });

    c.invalidate();
    expect(fired).toBe(true);
  });

  it("defers invalidation during Computing", () => {
    const c = makeComputed<number>("m");
    c.invalidate(); // deferred
    expect(c.state).toBe(ConsistencyState.Computing);

    c.trySetOutput(Result.ok(42));
    // Should have been invalidated after output was set
    expect(c.state).toBe(ConsistencyState.Invalidated);
  });

  it("stores error results", () => {
    const c = makeComputed<number>("m");
    c.trySetOutput(Result.err(new Error("fail")));
    expect(c.state).toBe(ConsistencyState.Consistent);
    expect(c.output!.hasError).toBe(true);
    expect(() => c.value).toThrow("fail");
  });

  it("throws when accessing value during Computing", () => {
    const c = makeComputed<number>("m");
    expect(() => c.value).toThrow("still computing");
  });
});

describe("Computed<T> — dependency tracking", () => {
  const svc = {};

  it("tracks dependencies", () => {
    const parent = new Computed<number>(new ComputedInput(svc, "parent", []));
    const child = new Computed<number>(new ComputedInput(svc, "child", []));

    child.trySetOutput(Result.ok(10));
    parent.addDependency(child);

    expect(parent.dependencyCount).toBe(1);
    expect(child.dependantCount).toBe(1);
  });

  it("transitive invalidation: child → parent", () => {
    const parent = new Computed<number>(new ComputedInput(svc, "parent", []));
    const child = new Computed<number>(new ComputedInput(svc, "child", []));

    child.trySetOutput(Result.ok(10));
    parent.addDependency(child);
    parent.trySetOutput(Result.ok(20));

    child.invalidate();
    expect(child.state).toBe(ConsistencyState.Invalidated);
    expect(parent.state).toBe(ConsistencyState.Invalidated);
  });

  it("transitive invalidation: A → B → C", () => {
    const a = new Computed<number>(new ComputedInput(svc, "a", []));
    const b = new Computed<number>(new ComputedInput(svc, "b", []));
    const c = new Computed<number>(new ComputedInput(svc, "c", []));

    c.trySetOutput(Result.ok(1));
    b.addDependency(c);
    b.trySetOutput(Result.ok(2));
    a.addDependency(b);
    a.trySetOutput(Result.ok(3));

    c.invalidate();
    expect(c.state).toBe(ConsistencyState.Invalidated);
    expect(b.state).toBe(ConsistencyState.Invalidated);
    expect(a.state).toBe(ConsistencyState.Invalidated);
  });

  it("fan-out invalidation: one dependency, multiple dependants", () => {
    const dep = new Computed<number>(new ComputedInput(svc, "dep", []));
    dep.trySetOutput(Result.ok(1));

    const dependants = Array.from({ length: 5 }, (_, i) => {
      const d = new Computed<number>(new ComputedInput(svc, `d${i}`, []));
      d.addDependency(dep);
      d.trySetOutput(Result.ok(i));
      return d;
    });

    dep.invalidate();
    for (const d of dependants) {
      expect(d.state).toBe(ConsistencyState.Invalidated);
    }
  });

  it("invalidating an already-invalid dependency invalidates new dependant immediately", () => {
    const child = new Computed<number>(new ComputedInput(svc, "child", []));
    child.trySetOutput(Result.ok(10));
    child.invalidate();

    const parent = new Computed<number>(new ComputedInput(svc, "parent", []));
    parent.addDependency(child);
    // Parent should be invalidated immediately since child is already invalid
    expect(parent.state).toBe(ConsistencyState.Invalidated);
  });

  it("does not add dependency if parent is not Computing", () => {
    const parent = new Computed<number>(new ComputedInput(svc, "parent", []));
    parent.trySetOutput(Result.ok(1));

    const child = new Computed<number>(new ComputedInput(svc, "child", []));
    child.trySetOutput(Result.ok(2));

    parent.addDependency(child); // should be ignored
    expect(parent.dependencyCount).toBe(0);
    expect(child.dependantCount).toBe(0);
  });

  it("cleans up dependency links on invalidation", () => {
    const parent = new Computed<number>(new ComputedInput(svc, "parent", []));
    const child = new Computed<number>(new ComputedInput(svc, "child", []));

    child.trySetOutput(Result.ok(10));
    parent.addDependency(child);
    parent.trySetOutput(Result.ok(20));

    parent.invalidate();
    expect(child.dependantCount).toBe(0);
    expect(parent.dependencyCount).toBe(0);
  });
});

describe("Computed<T> — auto-invalidation", () => {
  const svc = {};

  it("auto-invalidation timer fires after configured delay", async () => {
    const c = new Computed<number>(
      new ComputedInput(svc, "auto", []),
      { autoInvalidateMs: 50 }
    );
    c.trySetOutput(Result.ok(42));
    expect(c.isConsistent).toBe(true);

    await new Promise((r) => setTimeout(r, 100));
    expect(c.state).toBe(ConsistencyState.Invalidated);
  });

  it("auto-invalidation timer cancelled on manual invalidation", async () => {
    let autoFired = false;
    const c = new Computed<number>(
      new ComputedInput(svc, "autoCancel", []),
      { autoInvalidateMs: 100 }
    );
    c.trySetOutput(Result.ok(42));
    c.onInvalidated.on(() => {
      autoFired = true;
    });

    // Manually invalidate before timer fires
    c.invalidate();
    expect(autoFired).toBe(true);

    // Wait past the auto-invalidation time — should not fire again (already invalidated)
    autoFired = false;
    await new Promise((r) => setTimeout(r, 150));
    expect(autoFired).toBe(false);
  });
});

describe("Computed<T> — deep dependency chains", () => {
  const svc = {};

  it("deep dependency chain (10 levels) cascades invalidation", () => {
    const chain: Computed<number>[] = [];
    for (let i = 0; i < 10; i++) {
      chain.push(new Computed<number>(new ComputedInput(svc, `level${i}`, [])));
    }

    // Set outputs and wire dependencies: 0 → 1 → 2 → ... → 9
    chain[0].trySetOutput(Result.ok(0));
    for (let i = 1; i < chain.length; i++) {
      chain[i].addDependency(chain[i - 1]);
      chain[i].trySetOutput(Result.ok(i));
    }

    // Invalidate the root
    chain[0].invalidate();

    // All should be invalidated
    for (const c of chain) {
      expect(c.state).toBe(ConsistencyState.Invalidated);
    }
  });

  it("diamond dependency: A depends on B and C, both depend on D — A invalidated once", () => {
    const d = new Computed<number>(new ComputedInput(svc, "D", []));
    const b = new Computed<number>(new ComputedInput(svc, "B", []));
    const c = new Computed<number>(new ComputedInput(svc, "C", []));
    const a = new Computed<number>(new ComputedInput(svc, "A", []));

    d.trySetOutput(Result.ok(1));
    b.addDependency(d);
    b.trySetOutput(Result.ok(2));
    c.addDependency(d);
    c.trySetOutput(Result.ok(3));
    a.addDependency(b);
    a.addDependency(c);
    a.trySetOutput(Result.ok(4));

    let invalidateCount = 0;
    a.onInvalidated.on(() => invalidateCount++);

    d.invalidate();

    expect(a.state).toBe(ConsistencyState.Invalidated);
    // onInvalidated fires once even though both B and C were invalidated
    expect(invalidateCount).toBe(1);
  });
});
