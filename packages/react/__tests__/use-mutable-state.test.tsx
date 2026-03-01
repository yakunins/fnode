// @vitest-environment happy-dom
/** @jsxImportSource react */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { useMutableState } from "../src/use-mutable-state.js";
import { ComputedRegistry } from "@fnodejs/fusion";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  ComputedRegistry.clear();
  cleanup();
});

function Counter({ initial }: { initial: number }) {
  const [count, setCount] = useMutableState(initial);
  return (
    <div>
      <span data-testid="value">{count}</span>
      <button data-testid="inc" onClick={() => setCount(count + 1)}>+</button>
      <button data-testid="set5" onClick={() => setCount(5)}>set5</button>
    </div>
  );
}

describe("useMutableState", () => {
  it("renders initial value", () => {
    render(<Counter initial={0} />);
    expect(screen.getByTestId("value").textContent).toBe("0");
  });

  it("updates on setter call", async () => {
    render(<Counter initial={0} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("inc"));
    });

    expect(screen.getByTestId("value").textContent).toBe("1");
  });

  it("supports multiple updates", async () => {
    render(<Counter initial={0} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("inc"));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("inc"));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("inc"));
    });

    expect(screen.getByTestId("value").textContent).toBe("3");
  });

  it("setter sets exact value", async () => {
    render(<Counter initial={0} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("set5"));
    });

    expect(screen.getByTestId("value").textContent).toBe("5");
  });

  it("cleans up on unmount", async () => {
    function Wrapper({ show }: { show: boolean }) {
      return show ? <Counter initial={10} /> : <div data-testid="value">gone</div>;
    }

    const { rerender } = render(<Wrapper show={true} />);
    expect(screen.getByTestId("value").textContent).toBe("10");

    rerender(<Wrapper show={false} />);
    expect(screen.getByTestId("value").textContent).toBe("gone");

    // No errors on further ticks
    await act(() => delay(50));
  });

  it("works with string values", async () => {
    function StringState() {
      const [text, setText] = useMutableState("hello");
      return (
        <div>
          <span data-testid="value">{text}</span>
          <button data-testid="change" onClick={() => setText("world")}>change</button>
        </div>
      );
    }

    render(<StringState />);
    expect(screen.getByTestId("value").textContent).toBe("hello");

    await act(async () => {
      fireEvent.click(screen.getByTestId("change"));
    });

    expect(screen.getByTestId("value").textContent).toBe("world");
  });

  it("integrates with computed dependency graph", async () => {
    // useMutableState's underlying MutableState should work as a dependency source
    // for useComputed consumers. We test the MutableState part directly here.
    const { useMutableState: useMutable } = await import("../src/use-mutable-state.js");
    const { useComputed } = await import("../src/use-computed.js");
    const { MutableState } = await import("@fnodejs/fusion");

    // Use a shared MutableState to verify it participates in the graph
    const shared = new MutableState(10);

    function IntegrationTest() {
      const derived = useComputed(async () => {
        return shared.use() * 2;
      });
      return (
        <div>
          <span data-testid="derived">{String(derived)}</span>
          <button data-testid="update" onClick={() => { shared.value = 20; }}>update</button>
        </div>
      );
    }

    render(<IntegrationTest />);
    await act(() => delay(50));
    expect(screen.getByTestId("derived").textContent).toBe("20");

    await act(async () => {
      fireEvent.click(screen.getByTestId("update"));
    });

    await act(() => delay(50));
    expect(screen.getByTestId("derived").textContent).toBe("40");

    shared[Symbol.dispose]();
  });
});
