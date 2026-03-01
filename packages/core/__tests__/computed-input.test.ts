import { describe, it, expect } from "vitest";
import { ComputedInput } from "../src/computed-input.js";

describe("ComputedInput", () => {
  it("same service + method + args produce equal keys", () => {
    const svc = {};
    const a = new ComputedInput(svc, "getUser", ["alice"]);
    const b = new ComputedInput(svc, "getUser", ["alice"]);
    expect(a.equals(b)).toBe(true);
    expect(a.key).toBe(b.key);
  });

  it("different args produce different keys", () => {
    const svc = {};
    const a = new ComputedInput(svc, "getUser", ["alice"]);
    const b = new ComputedInput(svc, "getUser", ["bob"]);
    expect(a.equals(b)).toBe(false);
  });

  it("different methods produce different keys", () => {
    const svc = {};
    const a = new ComputedInput(svc, "getUser", ["alice"]);
    const b = new ComputedInput(svc, "getCart", ["alice"]);
    expect(a.equals(b)).toBe(false);
  });

  it("different services produce different keys", () => {
    const svc1 = {};
    const svc2 = {};
    const a = new ComputedInput(svc1, "getUser", ["alice"]);
    const b = new ComputedInput(svc2, "getUser", ["alice"]);
    expect(a.equals(b)).toBe(false);
  });

  it("same service instance gets same id across calls", () => {
    const svc = {};
    const a = new ComputedInput(svc, "m", []);
    const b = new ComputedInput(svc, "m", []);
    expect(a.key).toBe(b.key);
  });

  it("handles object args with stable key (sorted keys)", () => {
    const svc = {};
    const a = new ComputedInput(svc, "m", [{ b: 2, a: 1 }]);
    const b = new ComputedInput(svc, "m", [{ a: 1, b: 2 }]);
    expect(a.key).toBe(b.key);
  });

  it("handles no args", () => {
    const svc = {};
    const a = new ComputedInput(svc, "m", []);
    const b = new ComputedInput(svc, "m", []);
    expect(a.equals(b)).toBe(true);
  });

  it("handles null and undefined args", () => {
    const svc = {};
    const a = new ComputedInput(svc, "m", [null, undefined]);
    const b = new ComputedInput(svc, "m", [null, undefined]);
    expect(a.equals(b)).toBe(true);

    const c = new ComputedInput(svc, "m", [null]);
    expect(a.equals(c)).toBe(false);
  });

  it("handles number, boolean, bigint args", () => {
    const svc = {};
    const a = new ComputedInput(svc, "m", [42, true, BigInt(99)]);
    const b = new ComputedInput(svc, "m", [42, true, BigInt(99)]);
    expect(a.equals(b)).toBe(true);
  });

  it("array args produce stable keys (order matters)", () => {
    const svc = {};
    const a = new ComputedInput(svc, "m", [[1, 2, 3]]);
    const b = new ComputedInput(svc, "m", [[1, 2, 3]]);
    expect(a.key).toBe(b.key);

    // Different order → different key
    const c = new ComputedInput(svc, "m", [[3, 2, 1]]);
    expect(a.key).not.toBe(c.key);
  });

  it("nested object args produce stable keys (deep sorted)", () => {
    const svc = {};
    const a = new ComputedInput(svc, "m", [{ x: { b: 2, a: 1 }, y: 3 }]);
    const b = new ComputedInput(svc, "m", [{ y: 3, x: { a: 1, b: 2 } }]);
    expect(a.key).toBe(b.key);
  });
});
