import { describe, it, expect } from "vitest";
import { Result } from "../src/result.js";

describe("Result<T>", () => {
  it("ok: holds value", () => {
    const r = Result.ok(42);
    expect(r.hasValue).toBe(true);
    expect(r.hasError).toBe(false);
    expect(r.value).toBe(42);
    expect(r.valueOrDefault).toBe(42);
    expect(r.error).toBeUndefined();
  });

  it("err: holds error", () => {
    const err = new Error("fail");
    const r = Result.err(err);
    expect(r.hasValue).toBe(false);
    expect(r.hasError).toBe(true);
    expect(r.error).toBe(err);
    expect(r.valueOrDefault).toBeUndefined();
  });

  it("err: accessing .value throws", () => {
    const err = new Error("fail");
    const r = Result.err(err);
    expect(() => r.value).toThrow("fail");
  });

  it("from: captures success", () => {
    const r = Result.from(() => 10);
    expect(r.hasValue).toBe(true);
    expect(r.value).toBe(10);
  });

  it("from: captures error", () => {
    const r = Result.from(() => {
      throw new Error("boom");
    });
    expect(r.hasError).toBe(true);
    expect(r.error?.message).toBe("boom");
  });

  it("fromAsync: captures async success", async () => {
    const r = await Result.fromAsync(async () => 99);
    expect(r.value).toBe(99);
  });

  it("fromAsync: captures async error", async () => {
    const r = await Result.fromAsync(async () => {
      throw new Error("async boom");
    });
    expect(r.hasError).toBe(true);
    expect(r.error?.message).toBe("async boom");
  });

  it("from: wraps non-Error throws", () => {
    const r = Result.from(() => {
      throw "string error";
    });
    expect(r.hasError).toBe(true);
    expect(r.error?.message).toBe("string error");
  });

  it("from: wraps non-Error thrown values (number, object, symbol)", () => {
    const r1 = Result.from(() => {
      throw 42;
    });
    expect(r1.hasError).toBe(true);
    expect(r1.error?.message).toBe("42");

    const r2 = Result.from(() => {
      throw { code: 404 };
    });
    expect(r2.hasError).toBe(true);
    expect(r2.error?.message).toBe("[object Object]");

    const r3 = Result.from(() => {
      throw Symbol("oops");
    });
    expect(r3.hasError).toBe(true);
    expect(r3.error?.message).toBe("Symbol(oops)");
  });

  it("err: accessing .value re-throws the exact same error instance", () => {
    const err = new Error("original");
    const r = Result.err(err);

    let caught: unknown;
    try {
      r.value;
    } catch (e) {
      caught = e;
    }

    expect(caught).toBe(err); // reference equality
  });

  it("ok: stores falsy values correctly (0, empty string, false, null, undefined)", () => {
    const r0 = Result.ok(0);
    expect(r0.hasValue).toBe(true);
    expect(r0.value).toBe(0);

    const rEmpty = Result.ok("");
    expect(rEmpty.hasValue).toBe(true);
    expect(rEmpty.value).toBe("");

    const rFalse = Result.ok(false);
    expect(rFalse.hasValue).toBe(true);
    expect(rFalse.value).toBe(false);

    const rNull = Result.ok<null>(null);
    expect(rNull.hasValue).toBe(true);
    expect(rNull.value).toBe(null);

    const rUndef = Result.ok<undefined>(undefined);
    expect(rUndef.hasValue).toBe(true);
    expect(rUndef.value).toBe(undefined);
  });
});
