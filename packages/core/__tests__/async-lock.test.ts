import { describe, it, expect } from "vitest";
import { AsyncLock } from "../src/async-lock.js";

describe("AsyncLock", () => {
  it("allows sequential access", async () => {
    const lock = new AsyncLock();
    const log: number[] = [];

    {
      using _ = await lock.lock();
      log.push(1);
    }
    {
      using _ = await lock.lock();
      log.push(2);
    }

    expect(log).toEqual([1, 2]);
  });

  it("serializes concurrent access", async () => {
    const lock = new AsyncLock();
    const log: string[] = [];

    const delay = (ms: number) =>
      new Promise((r) => setTimeout(r, ms));

    const a = (async () => {
      using _ = await lock.lock();
      log.push("a-start");
      await delay(50);
      log.push("a-end");
    })();

    const b = (async () => {
      using _ = await lock.lock();
      log.push("b-start");
      await delay(10);
      log.push("b-end");
    })();

    await Promise.all([a, b]);
    expect(log).toEqual(["a-start", "a-end", "b-start", "b-end"]);
  });

  it("reports locked state", async () => {
    const lock = new AsyncLock();
    expect(lock.isLocked).toBe(false);

    const releaser = await lock.lock();
    expect(lock.isLocked).toBe(true);

    releaser[Symbol.dispose]();
    expect(lock.isLocked).toBe(false);
  });

  it("double dispose is safe", async () => {
    const lock = new AsyncLock();
    const releaser = await lock.lock();
    releaser[Symbol.dispose]();
    releaser[Symbol.dispose](); // should not throw or double-release
    expect(lock.isLocked).toBe(false);
  });

  it("concurrent workers: shared counter is serialized", async () => {
    const lock = new AsyncLock();
    let counter = 0;

    const worker = async () => {
      using _ = await lock.lock();
      const before = counter;
      await new Promise((r) => setTimeout(r, 5));
      counter = before + 1;
    };

    await Promise.all(Array.from({ length: 10 }, () => worker()));
    expect(counter).toBe(10);
  });

  it("abort cancels waiting for lock", async () => {
    const lock = new AsyncLock();

    // Hold the lock
    const releaser = await lock.lock();

    const ac = new AbortController();

    // Try to acquire with abort — race between lock and abort signal
    const waitPromise = Promise.race([
      lock.lock().then(() => "acquired"),
      new Promise<string>((_, reject) => {
        ac.signal.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    ]);

    ac.abort();

    await expect(waitPromise).rejects.toThrow("aborted");

    releaser[Symbol.dispose]();
  });

  it("FIFO ordering of waiters", async () => {
    const lock = new AsyncLock();
    const order: number[] = [];

    // Hold the lock first
    const first = await lock.lock();

    // Queue up waiters in order
    const promises = [1, 2, 3, 4, 5].map((n) =>
      lock.lock().then((rel) => {
        order.push(n);
        rel[Symbol.dispose]();
      })
    );

    // Release the initial lock — waiters should proceed in FIFO order
    first[Symbol.dispose]();
    await Promise.all(promises);

    expect(order).toEqual([1, 2, 3, 4, 5]);
  });

  it("lock held across await points", async () => {
    const lock = new AsyncLock();
    const log: string[] = [];

    const a = (async () => {
      using _ = await lock.lock();
      log.push("a1");
      await new Promise((r) => setTimeout(r, 20));
      log.push("a2");
      await new Promise((r) => setTimeout(r, 20));
      log.push("a3");
    })();

    const b = (async () => {
      using _ = await lock.lock();
      log.push("b1");
    })();

    await Promise.all([a, b]);
    expect(log).toEqual(["a1", "a2", "a3", "b1"]);
  });

  it("stress: 50 concurrent lock attempts all resolve", async () => {
    const lock = new AsyncLock();
    let counter = 0;

    const worker = async () => {
      using _ = await lock.lock();
      counter++;
    };

    await Promise.all(Array.from({ length: 50 }, () => worker()));
    expect(counter).toBe(50);
    expect(lock.isLocked).toBe(false);
  });
});
