// @vitest-environment happy-dom
/** @jsxImportSource react */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import React from "react";
import { useComputedState, type ComputedStateResult } from "../src/use-computed-state.js";
import { ComputedRegistry, Invalidation, computed } from "@fnodejs/fusion";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  ComputedRegistry.clear();
  cleanup();
});

function TestComponent({
  fn,
  deps = [],
  options = {},
}: {
  fn: () => Promise<unknown>;
  deps?: unknown[];
  options?: { updateDelayMs?: number };
}) {
  const result = useComputedState(fn, deps, options);
  return (
    <div>
      <span data-testid="value">{String(result.value)}</span>
      <span data-testid="error">{result.error?.message ?? "none"}</span>
      <span data-testid="updating">{String(result.isUpdating)}</span>
    </div>
  );
}

describe("useComputedState", () => {
  it("starts with isUpdating=true, then resolves", async () => {
    render(<TestComponent fn={async () => 42} />);

    // Initial state: updating
    expect(screen.getByTestId("updating").textContent).toBe("true");
    expect(screen.getByTestId("value").textContent).toBe("undefined");

    await act(() => delay(50));

    expect(screen.getByTestId("value").textContent).toBe("42");
    expect(screen.getByTestId("updating").textContent).toBe("false");
    expect(screen.getByTestId("error").textContent).toBe("none");
  });

  it("exposes error on computation failure", async () => {
    render(
      <TestComponent fn={async () => { throw new Error("boom"); }} />
    );

    await act(() => delay(50));

    expect(screen.getByTestId("error").textContent).toBe("boom");
    expect(screen.getByTestId("value").textContent).toBe("undefined");
    expect(screen.getByTestId("updating").textContent).toBe("false");
  });

  it("re-renders on invalidation with updated value", async () => {
    let counter = 0;
    class Svc {
      @computed()
      async getCount(): Promise<number> {
        return ++counter;
      }
    }
    const svc = new Svc();

    render(<TestComponent fn={() => svc.getCount()} />);

    await act(() => delay(50));
    expect(screen.getByTestId("value").textContent).toBe("1");

    // Invalidate
    await act(async () => {
      using _ = Invalidation.begin();
      await svc.getCount();
    });

    await act(() => delay(50));
    expect(screen.getByTestId("value").textContent).toBe("2");
  });

  it("transitions through isUpdating on re-computation", async () => {
    let counter = 0;
    const updatingStates: boolean[] = [];

    function TrackingComponent() {
      const result = useComputedState<number>(async () => {
        await delay(20);
        return ++counter;
      });
      updatingStates.push(result.isUpdating);
      return (
        <div>
          <span data-testid="value">{String(result.value)}</span>
          <span data-testid="updating">{String(result.isUpdating)}</span>
        </div>
      );
    }

    render(<TrackingComponent />);

    // First render: isUpdating should be true
    expect(updatingStates[0]).toBe(true);

    await act(() => delay(80));
    expect(screen.getByTestId("value").textContent).toBe("1");
    expect(screen.getByTestId("updating").textContent).toBe("false");
  });

  it("cleans up on unmount", async () => {
    let computeCount = 0;

    function Wrapper({ show }: { show: boolean }) {
      return show ? (
        <TestComponent fn={async () => { computeCount++; return "x"; }} />
      ) : (
        <div data-testid="value">gone</div>
      );
    }

    const { rerender } = render(<Wrapper show={true} />);
    await act(() => delay(50));
    const countAfterMount = computeCount;

    rerender(<Wrapper show={false} />);
    await act(() => delay(100));
    expect(computeCount).toBe(countAfterMount);
  });

  it("handles error then recovery", async () => {
    let callCount = 0;
    class Svc {
      @computed()
      async getData(): Promise<string> {
        callCount++;
        if (callCount === 1) throw new Error("initial fail");
        return `ok-${callCount}`;
      }
    }
    const svc = new Svc();

    render(<TestComponent fn={() => svc.getData()} />);

    await act(() => delay(50));
    expect(screen.getByTestId("error").textContent).toBe("initial fail");

    // Invalidate — next call succeeds
    await act(async () => {
      using _ = Invalidation.begin();
      await svc.getData();
    });

    await act(() => delay(50));
    expect(screen.getByTestId("value").textContent).toBe("ok-2");
    expect(screen.getByTestId("error").textContent).toBe("none");
  });
});
