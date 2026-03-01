import { describe, bench, beforeEach } from "vitest";
import { computed, Invalidation, ComputedRegistry } from "@fnode/fusion";
import { Commander, commandHandler } from "../src/index.js";

// --- Commands ---

class AddCommand {
  constructor(
    readonly a: number,
    readonly b: number,
  ) {}
}

class SetValueCommand {
  constructor(
    readonly key: string,
    readonly value: number,
  ) {}
}

class OuterCommand {
  constructor(readonly n: number) {}
}

// --- Services ---

class MathService {
  @commandHandler(AddCommand)
  async add(cmd: AddCommand): Promise<number> {
    return cmd.a + cmd.b;
  }
}

class KVService {
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

describe("Commander pipeline", () => {
  let commander: Commander;
  let mathSvc: MathService;
  let kvSvc: KVService;

  beforeEach(() => {
    ComputedRegistry.clear();
    commander = new Commander();
    mathSvc = new MathService();
    kvSvc = new KVService();
    commander.addService(mathSvc);
    commander.addService(kvSvc);
  });

  bench("call() — no invalidation branch", async () => {
    await commander.call<number>(new AddCommand(3, 4));
  });

  bench("call() — with invalidation", async () => {
    await commander.call(new SetValueCommand("k", 1));
  });

  bench("baseline: direct handler call", async () => {
    await mathSvc.add(new AddCommand(3, 4));
  });
});

describe("Commander nested commands", () => {
  let commander: Commander;

  beforeEach(() => {
    ComputedRegistry.clear();
    commander = new Commander();

    class InnerService {
      @commandHandler(AddCommand)
      async add(cmd: AddCommand): Promise<number> {
        return cmd.a + cmd.b;
      }
    }

    commander.addService(new InnerService());
    commander.addHandler(OuterCommand, async (cmd) => {
      const r = await commander.call<number>(new AddCommand(cmd.n, cmd.n));
      return r * 2;
    });
  });

  bench("nested call (2 levels)", async () => {
    await commander.call<number>(new OuterCommand(5));
  });
});
