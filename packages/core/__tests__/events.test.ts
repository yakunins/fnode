import { describe, it, expect } from "vitest";
import { TypedEvent } from "../src/events.js";

describe("TypedEvent<T>", () => {
  it("fires to subscribers", () => {
    const event = new TypedEvent<number>();
    const received: number[] = [];
    event.on((v) => received.push(v));

    event.fire(1);
    event.fire(2);
    expect(received).toEqual([1, 2]);
  });

  it("unsubscribes via dispose", () => {
    const event = new TypedEvent<number>();
    const received: number[] = [];

    {
      using _ = event.on((v) => received.push(v));
      event.fire(1);
    }

    event.fire(2);
    expect(received).toEqual([1]);
  });

  it("once fires only once", () => {
    const event = new TypedEvent<string>();
    const received: string[] = [];
    event.once((v) => received.push(v));

    event.fire("a");
    event.fire("b");
    expect(received).toEqual(["a"]);
  });

  it("next() returns promise for next fire", async () => {
    const event = new TypedEvent<number>();
    const promise = event.next();

    event.fire(42);
    expect(await promise).toBe(42);
  });

  it("hasHandlers reflects subscription state", () => {
    const event = new TypedEvent<void>();
    expect(event.hasHandlers).toBe(false);

    const sub = event.on(() => {});
    expect(event.hasHandlers).toBe(true);

    sub[Symbol.dispose]();
    expect(event.hasHandlers).toBe(false);
  });

  it("clear removes all handlers", () => {
    const event = new TypedEvent<number>();
    const received: number[] = [];
    event.on((v) => received.push(v));
    event.on((v) => received.push(v * 10));

    event.fire(1);
    expect(received).toEqual([1, 10]);

    event.clear();
    event.fire(2);
    expect(received).toEqual([1, 10]); // no new entries
  });

  it("multiple subscribers all receive same event", () => {
    const event = new TypedEvent<number>();
    const r1: number[] = [];
    const r2: number[] = [];
    const r3: number[] = [];

    event.on((v) => r1.push(v));
    event.on((v) => r2.push(v));
    event.on((v) => r3.push(v));

    event.fire(42);
    expect(r1).toEqual([42]);
    expect(r2).toEqual([42]);
    expect(r3).toEqual([42]);
  });

  it("unsubscribe during fire does not break iteration", () => {
    const event = new TypedEvent<number>();
    const received: string[] = [];

    // Handler A unsubscribes handler B during fire
    let subB: Disposable;
    event.on(() => {
      received.push("a");
      subB[Symbol.dispose]();
    });
    subB = event.on(() => received.push("b"));
    event.on(() => received.push("c"));

    event.fire(1);
    // TypedEvent iterates a Set — deleting from a Set during iteration is
    // well-defined in JS: "b" is skipped because it was deleted before being visited
    // OR it was already visited. Either way, no crash.
    expect(received).toContain("a");
    expect(received).toContain("c");
    // No crash is the key assertion
  });
});
