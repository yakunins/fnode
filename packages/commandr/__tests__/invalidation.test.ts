import { describe, it, expect, beforeEach } from "vitest";
import {
  computed,
  Invalidation,
  ComputedRegistry,
  ComputedState,
  capture,
} from "@fnodejs/fusion";
import { Commander, commandHandler, CommandContext } from "../src/index.js";

beforeEach(() => {
  ComputedRegistry.clear();
});

// --- Test commands ---

class SetValueCommand {
  constructor(
    readonly key: string,
    readonly value: number,
  ) {}
}

class AddItemCommand {
  constructor(
    readonly userId: string,
    readonly item: string,
  ) {}
}

class TransferCommand {
  constructor(
    readonly from: string,
    readonly to: string,
    readonly amount: number,
  ) {}
}

// --- Test services ---

class KeyValueService {
  #data = new Map<string, number>();

  @commandHandler(SetValueCommand)
  async setValue(cmd: SetValueCommand): Promise<void> {
    if (Invalidation.isActive) {
      this.getValue(cmd.key);
      return;
    }
    this.#data.set(cmd.key, cmd.value);
  }

  @computed()
  async getValue(key: string): Promise<number> {
    return this.#data.get(key) ?? 0;
  }
}

class CartService {
  #items = new Map<string, string[]>();

  @commandHandler(AddItemCommand)
  async addItem(cmd: AddItemCommand): Promise<void> {
    if (Invalidation.isActive) {
      this.getItems(cmd.userId);
      return;
    }
    const items = this.#items.get(cmd.userId) ?? [];
    items.push(cmd.item);
    this.#items.set(cmd.userId, items);
  }

  @computed()
  async getItems(userId: string): Promise<string[]> {
    return [...(this.#items.get(userId) ?? [])];
  }
}

describe("InvalidationMiddleware", () => {
  it("automatically invalidates @computed after command", async () => {
    const svc = new KeyValueService();
    const commander = new Commander();
    commander.addService(svc);

    // Populate cache
    expect(await svc.getValue("x")).toBe(0);

    // Execute command — should mutate + auto-invalidate
    await commander.call(new SetValueCommand("x", 42));

    // Should return fresh value
    expect(await svc.getValue("x")).toBe(42);
  });

  it("Invalidation.isActive is true during invalidation phase", async () => {
    let isActiveInHandler = false;
    let isActiveDuringInvalidation = false;

    class TrackingService {
      #callCount = 0;

      @commandHandler(SetValueCommand)
      async handle(cmd: SetValueCommand): Promise<void> {
        if (Invalidation.isActive) {
          isActiveDuringInvalidation = true;
          return;
        }
        isActiveInHandler = Invalidation.isActive;
      }
    }

    const commander = new Commander();
    commander.addService(new TrackingService());

    await commander.call(new SetValueCommand("x", 1));

    expect(isActiveInHandler).toBe(false);
    expect(isActiveDuringInvalidation).toBe(true);
  });

  it("invalidates multiple keys in one command", async () => {
    class MultiKeyService {
      #data = new Map<string, number>();

      @commandHandler(TransferCommand)
      async transfer(cmd: TransferCommand): Promise<void> {
        if (Invalidation.isActive) {
          this.getBalance(cmd.from);
          this.getBalance(cmd.to);
          return;
        }
        this.#data.set(cmd.from, (this.#data.get(cmd.from) ?? 0) - cmd.amount);
        this.#data.set(cmd.to, (this.#data.get(cmd.to) ?? 0) + cmd.amount);
      }

      @computed()
      async getBalance(account: string): Promise<number> {
        return this.#data.get(account) ?? 0;
      }
    }

    const svc = new MultiKeyService();
    const commander = new Commander();
    commander.addService(svc);

    // Populate cache
    expect(await svc.getBalance("alice")).toBe(0);
    expect(await svc.getBalance("bob")).toBe(0);

    // Transfer
    await commander.call(new TransferCommand("alice", "bob", 100));

    // Both should be invalidated and return fresh values
    expect(await svc.getBalance("alice")).toBe(-100);
    expect(await svc.getBalance("bob")).toBe(100);
  });

  it("transitive invalidation cascades through dependency graph", async () => {
    const svc = new KeyValueService();
    const commander = new Commander();
    commander.addService(svc);

    // DerivedService depends on KeyValueService
    class DerivedService {
      constructor(readonly kv: KeyValueService) {}

      @computed()
      async getDoubled(key: string): Promise<number> {
        return (await this.kv.getValue(key)) * 2;
      }
    }

    const derived = new DerivedService(svc);

    // Populate cache (derived depends on kv.getValue)
    expect(await derived.getDoubled("x")).toBe(0);

    // Command invalidates kv.getValue("x") → should cascade to derived.getDoubled("x")
    await commander.call(new SetValueCommand("x", 5));

    expect(await derived.getDoubled("x")).toBe(10);
  });

  it("works with capture() for reactive observation", async () => {
    const svc = new KeyValueService();
    const commander = new Commander();
    commander.addService(svc);

    // Capture initial value
    const captured = await capture(async () => svc.getValue("y"));
    expect(captured.value).toBe(0);

    // Command should invalidate
    await commander.call(new SetValueCommand("y", 99));

    // The captured computed should be invalidated
    const updated = await captured.update();
    expect(updated.value).toBe(99);
  });

  it("works with ComputedState for auto-updating loop", async () => {
    const svc = new KeyValueService();
    const commander = new Commander();
    commander.addService(svc);

    using state = new ComputedState(async () => svc.getValue("z"));

    await new Promise((r) => setTimeout(r, 20));
    expect(state.value).toBe(0);

    // Command should invalidate → ComputedState should auto-recompute
    await commander.call(new SetValueCommand("z", 77));

    await new Promise((r) => setTimeout(r, 50));
    expect(state.value).toBe(77);
  });

  it("cart service: add items and auto-invalidate", async () => {
    const svc = new CartService();
    const commander = new Commander();
    commander.addService(svc);

    expect(await svc.getItems("u1")).toEqual([]);

    await commander.call(new AddItemCommand("u1", "apple"));
    expect(await svc.getItems("u1")).toEqual(["apple"]);

    await commander.call(new AddItemCommand("u1", "banana"));
    expect(await svc.getItems("u1")).toEqual(["apple", "banana"]);
  });

  it("command without invalidation branch still executes", async () => {
    class SimpleCommand {
      constructor(readonly value: number) {}
    }

    class SimpleService {
      result = 0;

      @commandHandler(SimpleCommand)
      async handle(cmd: SimpleCommand): Promise<number> {
        this.result = cmd.value;
        return cmd.value;
      }
    }

    const svc = new SimpleService();
    const commander = new Commander();
    commander.addService(svc);

    const result = await commander.call<number>(new SimpleCommand(42));
    expect(result).toBe(42);
    expect(svc.result).toBe(42);
  });
});
