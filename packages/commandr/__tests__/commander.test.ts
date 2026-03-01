import { describe, it, expect, beforeEach } from "vitest";
import { ComputedRegistry } from "@fnode/fusion";
import {
  Commander,
  commandHandler,
  CommandContext,
  type CommandMiddleware,
} from "../src/index.js";

beforeEach(() => {
  ComputedRegistry.clear();
});

// --- Test commands ---

class AddCommand {
  constructor(
    readonly a: number,
    readonly b: number,
  ) {}
}

class EchoCommand {
  constructor(readonly message: string) {}
}

class UnknownCommand {}

// --- Test services ---

class MathService {
  @commandHandler(AddCommand)
  async add(cmd: AddCommand): Promise<number> {
    return cmd.a + cmd.b;
  }
}

class EchoService {
  @commandHandler(EchoCommand)
  async echo(cmd: EchoCommand): Promise<string> {
    return cmd.message;
  }
}

describe("Commander", () => {
  it("resolves and executes a handler", async () => {
    const commander = new Commander();
    const svc = new MathService();
    commander.addService(svc);

    const result = await commander.call<number>(new AddCommand(3, 4));
    expect(result).toBe(7);
  });

  it("returns typed result from handler", async () => {
    const commander = new Commander();
    const svc = new EchoService();
    commander.addService(svc);

    const result = await commander.call<string>(new EchoCommand("hello"));
    expect(result).toBe("hello");
  });

  it("throws for unknown command type", async () => {
    const commander = new Commander();

    await expect(commander.call(new UnknownCommand())).rejects.toThrow(
      "No handler registered for command: UnknownCommand",
    );
  });

  it("supports addHandler() for inline handler registration", async () => {
    const commander = new Commander();
    commander.addHandler(
      AddCommand,
      async (cmd) => cmd.a * cmd.b,
    );

    const result = await commander.call<number>(new AddCommand(5, 6));
    expect(result).toBe(30);
  });

  it("addService() scans all @commandHandler methods", async () => {
    class MultiService {
      @commandHandler(AddCommand)
      async add(cmd: AddCommand): Promise<number> {
        return cmd.a + cmd.b;
      }

      @commandHandler(EchoCommand)
      async echo(cmd: EchoCommand): Promise<string> {
        return cmd.message;
      }
    }

    const commander = new Commander();
    commander.addService(new MultiService());

    expect(await commander.call<number>(new AddCommand(1, 2))).toBe(3);
    expect(await commander.call<string>(new EchoCommand("hi"))).toBe("hi");
  });

  it("sets CommandContext.current during handler execution", async () => {
    const commander = new Commander();
    let capturedContext: CommandContext | undefined;

    commander.addHandler(AddCommand, async (cmd, ctx) => {
      capturedContext = CommandContext.current;
      return cmd.a + cmd.b;
    });

    const command = new AddCommand(1, 1);
    await commander.call(command);

    expect(capturedContext).toBeDefined();
    expect(capturedContext!.command).toBe(command);
  });

  it("middleware filters execute in priority order (descending)", async () => {
    const order: string[] = [];

    const commander = new Commander();
    commander.addHandler(AddCommand, async (cmd) => {
      order.push("handler");
      return cmd.a + cmd.b;
    });

    const lowFilter: CommandMiddleware = async (cmd, ctx, next) => {
      order.push("low-before");
      const result = await next();
      order.push("low-after");
      return result;
    };

    const highFilter: CommandMiddleware = async (cmd, ctx, next) => {
      order.push("high-before");
      const result = await next();
      order.push("high-after");
      return result;
    };

    commander.addFilter(highFilter, 500);
    commander.addFilter(lowFilter, 50);

    await commander.call(new AddCommand(1, 1));

    // High(500) → Invalidation(100) → Low(50) → Handler
    // InvalidationMiddleware re-invokes handler after completion, so "handler" appears twice
    expect(order).toEqual([
      "high-before",
      "low-before",
      "handler",         // actual execution
      "low-after",
      "handler",         // invalidation re-invocation
      "high-after",
    ]);
  });

  it("nested commands create linked contexts", async () => {
    const commander = new Commander();
    let innerContext: CommandContext | undefined;

    commander.addHandler(AddCommand, async (cmd) => {
      // Issue a nested command
      return commander.call<string>(new EchoCommand("nested"));
    });

    commander.addHandler(EchoCommand, async (cmd) => {
      innerContext = CommandContext.current;
      return cmd.message;
    });

    await commander.call(new AddCommand(1, 1));

    expect(innerContext).toBeDefined();
    expect(innerContext!.outerContext).toBeDefined();
    expect(innerContext!.outerContext!.command).toBeInstanceOf(AddCommand);
    expect(innerContext!.command).toBeInstanceOf(EchoCommand);
  });

  it("nested commands share items bag", async () => {
    const commander = new Commander();

    commander.addHandler(AddCommand, async (cmd) => {
      CommandContext.current!.items.set("outer", true);
      return commander.call<string>(new EchoCommand("nested"));
    });

    commander.addHandler(EchoCommand, async (cmd) => {
      expect(CommandContext.current!.items.get("outer")).toBe(true);
      CommandContext.current!.items.set("inner", true);
      return cmd.message;
    });

    await commander.call(new AddCommand(1, 1));
  });

  it("addService with no handlers does not throw", () => {
    const commander = new Commander();
    const plain = { foo: "bar" };
    expect(() => commander.addService(plain)).not.toThrow();
  });
});
