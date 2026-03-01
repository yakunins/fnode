import { describe, it, expect } from "vitest";
import { VersionGenerator } from "../src/version-generator.js";

describe("VersionGenerator", () => {
  it("starts at 0", () => {
    const gen = new VersionGenerator();
    expect(gen.current).toBe(0);
  });

  it("returns strictly increasing values", () => {
    const gen = new VersionGenerator();
    const v1 = gen.next();
    const v2 = gen.next();
    const v3 = gen.next();
    expect(v1).toBe(1);
    expect(v2).toBe(2);
    expect(v3).toBe(3);
    expect(gen.current).toBe(3);
  });

  it("independent generators are independent", () => {
    const a = new VersionGenerator();
    const b = new VersionGenerator();
    a.next();
    a.next();
    expect(a.current).toBe(2);
    expect(b.current).toBe(0);
  });
});
