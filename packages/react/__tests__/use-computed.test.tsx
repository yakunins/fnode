// @vitest-environment happy-dom
/** @jsxImportSource react */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import React from "react";
import { useComputed } from "../src/use-computed.js";
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
  options?: { updateDelayMs?: number; initialValue?: unknown };
}) {
  const value = useComputed(fn, deps, options);
  return <div data-testid="value">{String(value)}</div>;
}

describe("useComputed", () => {
  it("renders initial undefined then resolved value", async () => {
    render(<TestComponent fn={async () => 42} />);

    // Initially undefined
    expect(screen.getByTestId("value").textContent).toBe("undefined");

    // After computation resolves
    await act(() => delay(50));
    expect(screen.getByTestId("value").textContent).toBe("42");
  });

  it("renders initialValue before computation completes", async () => {
    render(
      <TestComponent
        fn={async () => {
          await delay(100);
          return 99;
        }}
        options={{ initialValue: 0 }}
      />
    );

    expect(screen.getByTestId("value").textContent).toBe("0");

    await act(() => delay(150));
    expect(screen.getByTestId("value").textContent).toBe("99");
  });

  it("re-renders on invalidation", async () => {
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

  it("cleans up on unmount (no leak)", async () => {
    let computeCount = 0;

    function Wrapper({ show }: { show: boolean }) {
      return show ? (
        <TestComponent
          fn={async () => {
            computeCount++;
            return "hello";
          }}
        />
      ) : (
        <div data-testid="value">gone</div>
      );
    }

    const { rerender } = render(<Wrapper show={true} />);
    await act(() => delay(50));
    expect(screen.getByTestId("value").textContent).toBe("hello");
    const countAfterMount = computeCount;

    // Unmount the hook component
    rerender(<Wrapper show={false} />);
    expect(screen.getByTestId("value").textContent).toBe("gone");

    // Wait and ensure no further computations
    await act(() => delay(100));
    expect(computeCount).toBe(countAfterMount);
  });

  it("does not render error values (keeps last good value)", async () => {
    let callCount = 0;
    class Svc {
      @computed()
      async getData(): Promise<string> {
        callCount++;
        if (callCount === 2) throw new Error("fail");
        return `v${callCount}`;
      }
    }
    const svc = new Svc();

    render(<TestComponent fn={() => svc.getData()} />);

    await act(() => delay(50));
    expect(screen.getByTestId("value").textContent).toBe("v1");

    // Invalidate — next call will throw
    await act(async () => {
      using _ = Invalidation.begin();
      await svc.getData();
    });

    await act(() => delay(50));
    // Should still show v1 since useComputed only updates on non-error
    expect(screen.getByTestId("value").textContent).toBe("v1");
  });

  it("returns string values correctly", async () => {
    render(<TestComponent fn={async () => "hello world"} />);
    await act(() => delay(50));
    expect(screen.getByTestId("value").textContent).toBe("hello world");
  });
});
