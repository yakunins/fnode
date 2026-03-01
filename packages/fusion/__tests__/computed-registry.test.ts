import { describe, it, expect, beforeEach } from "vitest";
import { ComputedInput, Result } from "@fnodejs/core";
import { Computed, ComputedRegistry } from "../src/index.js";

beforeEach(() => {
  ComputedRegistry.clear();
});

describe("ComputedRegistry", () => {
  const svc = {};

  it("register and get", () => {
    const c = new Computed<number>(new ComputedInput(svc, "m", [1]));
    c.trySetOutput(Result.ok(42));
    ComputedRegistry.register(c);

    const found = ComputedRegistry.get(c.input.key);
    expect(found).toBe(c);
  });

  it("get returns undefined for missing key", () => {
    expect(ComputedRegistry.get("nonexistent")).toBeUndefined();
  });

  it("get returns undefined for invalidated entry", () => {
    const c = new Computed<number>(new ComputedInput(svc, "m", []));
    c.trySetOutput(Result.ok(42));
    ComputedRegistry.register(c);
    c.invalidate();

    expect(ComputedRegistry.get(c.input.key)).toBeUndefined();
  });

  it("register invalidates previous version", () => {
    const c1 = new Computed<number>(new ComputedInput(svc, "m", [1]));
    c1.trySetOutput(Result.ok(1));
    ComputedRegistry.register(c1);

    const c2 = new Computed<number>(new ComputedInput(svc, "m", [1]));
    c2.trySetOutput(Result.ok(2));
    ComputedRegistry.register(c2);

    expect(c1.state).toBe(2); // Invalidated
    expect(ComputedRegistry.get(c1.input.key)).toBe(c2);
  });

  it("unregister removes entry", () => {
    const c = new Computed<number>(new ComputedInput(svc, "m", []));
    c.trySetOutput(Result.ok(42));
    ComputedRegistry.register(c);
    ComputedRegistry.unregister(c);

    expect(ComputedRegistry.get(c.input.key)).toBeUndefined();
    expect(ComputedRegistry.size).toBe(0);
  });

  it("unregister does not remove newer version", () => {
    const c1 = new Computed<number>(new ComputedInput(svc, "m", [1]));
    c1.trySetOutput(Result.ok(1));
    ComputedRegistry.register(c1);

    const c2 = new Computed<number>(new ComputedInput(svc, "m", [1]));
    c2.trySetOutput(Result.ok(2));
    ComputedRegistry.register(c2);

    ComputedRegistry.unregister(c1); // should not remove c2
    expect(ComputedRegistry.get(c2.input.key)).toBe(c2);
  });

  it("tracks size", () => {
    expect(ComputedRegistry.size).toBe(0);
    const c1 = new Computed<number>(new ComputedInput(svc, "a", []));
    c1.trySetOutput(Result.ok(1));
    ComputedRegistry.register(c1);
    expect(ComputedRegistry.size).toBe(1);

    const c2 = new Computed<number>(new ComputedInput(svc, "b", []));
    c2.trySetOutput(Result.ok(2));
    ComputedRegistry.register(c2);
    expect(ComputedRegistry.size).toBe(2);
  });

  it("rapid register+get cycles do not lose entries", () => {
    for (let i = 0; i < 100; i++) {
      const c = new Computed<number>(new ComputedInput(svc, `rapid${i}`, []));
      c.trySetOutput(Result.ok(i));
      ComputedRegistry.register(c);
      expect(ComputedRegistry.get(c.input.key)).toBe(c);
    }
    expect(ComputedRegistry.size).toBe(100);
  });

  it("clear removes all entries", () => {
    const c1 = new Computed<number>(new ComputedInput(svc, "x", []));
    c1.trySetOutput(Result.ok(1));
    ComputedRegistry.register(c1);

    const c2 = new Computed<number>(new ComputedInput(svc, "y", []));
    c2.trySetOutput(Result.ok(2));
    ComputedRegistry.register(c2);

    expect(ComputedRegistry.size).toBe(2);
    ComputedRegistry.clear();
    expect(ComputedRegistry.size).toBe(0);
    expect(ComputedRegistry.get(c1.input.key)).toBeUndefined();
    expect(ComputedRegistry.get(c2.input.key)).toBeUndefined();
  });
});
