import { describe, it, expect } from "vitest";
import { FixedDelayer } from "../src/update-delayer.js";

describe("FixedDelayer", () => {
  describe("none", () => {
    it("resolves immediately", async () => {
      const start = performance.now();
      await FixedDelayer.none.delay(0);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(5);
    });

    it("resolves immediately regardless of retryCount", async () => {
      await FixedDelayer.none.delay(5);
    });
  });

  describe("nextTick", () => {
    it("resolves after yielding to event loop", async () => {
      await FixedDelayer.nextTick.delay(0);
    });

    it("respects AbortSignal cancellation", async () => {
      const ac = new AbortController();
      ac.abort();
      await expect(FixedDelayer.nextTick.delay(0, ac.signal)).rejects.toThrow();
    });
  });

  describe("ms()", () => {
    it("delays for the specified duration", async () => {
      const delayer = FixedDelayer.ms(50);
      const start = performance.now();
      await delayer.delay(0);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });

    it("respects AbortSignal cancellation", async () => {
      const delayer = FixedDelayer.ms(5000);
      const ac = new AbortController();

      const promise = delayer.delay(0, ac.signal);
      ac.abort();

      await expect(promise).rejects.toThrow();
    });

    it("rejects immediately if signal already aborted", async () => {
      const delayer = FixedDelayer.ms(5000);
      const ac = new AbortController();
      ac.abort();

      await expect(delayer.delay(0, ac.signal)).rejects.toThrow();
    });
  });
});
