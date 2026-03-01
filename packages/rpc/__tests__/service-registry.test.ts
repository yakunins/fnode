import { describe, it, expect, beforeEach } from "vitest";
import { computed, ComputedRegistry } from "@fnode/fusion";
import { RpcServiceRegistry } from "../src/service-registry.js";

beforeEach(() => {
  ComputedRegistry.clear();
});

class CounterService {
  #values = new Map<string, number>();

  set(key: string, value: number): void {
    this.#values.set(key, value);
  }

  @computed()
  async get(key: string): Promise<number> {
    return this.#values.get(key) ?? 0;
  }

  async regularMethod(): Promise<string> {
    return "hello";
  }
}

describe("RpcServiceRegistry", () => {
  it("registers and resolves a service", () => {
    const registry = new RpcServiceRegistry();
    const counter = new CounterService();
    registry.register("Counter", counter);

    expect(registry.has("Counter")).toBe(true);
    expect(registry.size).toBe(1);
  });

  it("resolves methods", () => {
    const registry = new RpcServiceRegistry();
    const counter = new CounterService();
    registry.register("Counter", counter);

    const getDef = registry.getMethod("Counter", "get");
    expect(getDef).toBeDefined();
    expect(getDef!.method).toBe("get");
    expect(getDef!.service).toBe("Counter");
    expect(getDef!.target).toBe(counter);
  });

  it("detects @computed methods", () => {
    const registry = new RpcServiceRegistry();
    const counter = new CounterService();
    registry.register("Counter", counter);

    const getDef = registry.getMethod("Counter", "get");
    expect(getDef!.isComputed).toBe(true);

    const regularDef = registry.getMethod("Counter", "regularMethod");
    expect(regularDef!.isComputed).toBe(false);
  });

  it("detects non-@computed methods", () => {
    const registry = new RpcServiceRegistry();
    const counter = new CounterService();
    registry.register("Counter", counter);

    const setDef = registry.getMethod("Counter", "set");
    expect(setDef!.isComputed).toBe(false);
  });

  it("returns undefined for unknown service", () => {
    const registry = new RpcServiceRegistry();
    expect(registry.getService("Nonexistent")).toBeUndefined();
    expect(registry.getMethod("Nonexistent", "foo")).toBeUndefined();
  });

  it("returns undefined for unknown method", () => {
    const registry = new RpcServiceRegistry();
    const counter = new CounterService();
    registry.register("Counter", counter);

    expect(registry.getMethod("Counter", "nonexistent")).toBeUndefined();
  });

  it("lists all methods for a service", () => {
    const registry = new RpcServiceRegistry();
    const counter = new CounterService();
    registry.register("Counter", counter);

    const svc = registry.getService("Counter");
    expect(svc).toBeDefined();
    expect(svc!.methods.has("get")).toBe(true);
    expect(svc!.methods.has("set")).toBe(true);
    expect(svc!.methods.has("regularMethod")).toBe(true);
    // constructor should not be included
    expect(svc!.methods.has("constructor")).toBe(false);
  });

  it("clears all services", () => {
    const registry = new RpcServiceRegistry();
    registry.register("A", new CounterService());
    registry.register("B", new CounterService());
    expect(registry.size).toBe(2);

    registry.clear();
    expect(registry.size).toBe(0);
  });
});
