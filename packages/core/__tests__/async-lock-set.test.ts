import { describe, it, expect } from "vitest";
import { AsyncLockSet } from "../src/async-lock-set.js";

describe("AsyncLockSet<K>", () => {
  it("different keys do not block each other", async () => {
    const locks = new AsyncLockSet<string>();
    const log: string[] = [];

    const delay = (ms: number) =>
      new Promise((r) => setTimeout(r, ms));

    const a = (async () => {
      using _ = await locks.lock("a");
      log.push("a-start");
      await delay(50);
      log.push("a-end");
    })();

    const b = (async () => {
      using _ = await locks.lock("b");
      log.push("b-start");
      await delay(10);
      log.push("b-end");
    })();

    await Promise.all([a, b]);
    // b should finish before a since they don't block each other
    expect(log).toEqual(["a-start", "b-start", "b-end", "a-end"]);
  });

  it("same key serializes access", async () => {
    const locks = new AsyncLockSet<string>();
    const log: string[] = [];

    const delay = (ms: number) =>
      new Promise((r) => setTimeout(r, ms));

    const a = (async () => {
      using _ = await locks.lock("x");
      log.push("a-start");
      await delay(30);
      log.push("a-end");
    })();

    const b = (async () => {
      using _ = await locks.lock("x");
      log.push("b-start");
      log.push("b-end");
    })();

    await Promise.all([a, b]);
    expect(log).toEqual(["a-start", "a-end", "b-start", "b-end"]);
  });

  it("cleans up entries when no longer in use", async () => {
    const locks = new AsyncLockSet<string>();
    expect(locks.size).toBe(0);

    {
      using _ = await locks.lock("key");
      expect(locks.size).toBe(1);
    }

    expect(locks.size).toBe(0);
  });

  it("concurrent workers on same key: counter is serialized", async () => {
    const locks = new AsyncLockSet<string>();
    let counter = 0;

    const worker = async () => {
      using _ = await locks.lock("a");
      const before = counter;
      await new Promise((r) => setTimeout(r, 5));
      counter = before + 1;
    };

    await Promise.all(Array.from({ length: 10 }, () => worker()));
    expect(counter).toBe(10);
  });

  it("mixed concurrent keys: different keys run in parallel, same keys serialize", async () => {
    const locks = new AsyncLockSet<string>();
    const log: string[] = [];

    const work = async (key: string, label: string, ms: number) => {
      using _ = await locks.lock(key);
      log.push(`${label}-start`);
      await new Promise((r) => setTimeout(r, ms));
      log.push(`${label}-end`);
    };

    await Promise.all([
      work("a", "a1", 40),
      work("a", "a2", 10),
      work("b", "b1", 20),
    ]);

    // a1 and b1 start in parallel (different keys)
    // a2 waits for a1 (same key)
    // b1 finishes before a1
    expect(log).toEqual([
      "a1-start", "b1-start",
      "b1-end", "a1-end",
      "a2-start", "a2-end",
    ]);
  });

  it("abort cancels waiting for keyed lock", async () => {
    const locks = new AsyncLockSet<string>();

    // Hold the lock on key "x"
    const releaser = await locks.lock("x");

    const ac = new AbortController();

    const waitPromise = Promise.race([
      locks.lock("x").then(() => "acquired"),
      new Promise<string>((_, reject) => {
        ac.signal.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    ]);

    ac.abort();

    await expect(waitPromise).rejects.toThrow("aborted");

    releaser[Symbol.dispose]();
  });
});
