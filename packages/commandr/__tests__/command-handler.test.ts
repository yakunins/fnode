import { describe, it, expect } from "vitest";
import {
  commandHandler,
  COMMAND_HANDLER,
  type CommandHandlerDef,
} from "../src/index.js";

// --- Test commands ---

class GreetCommand {
  constructor(readonly name: string) {}
}

class FarewellCommand {
  constructor(readonly name: string) {}
}

// --- Test services ---

class GreetingService {
  @commandHandler(GreetCommand)
  async greet(cmd: GreetCommand): Promise<string> {
    return `Hello, ${cmd.name}!`;
  }
}

class MultiHandlerService {
  @commandHandler(GreetCommand)
  async greet(cmd: GreetCommand): Promise<string> {
    return `Hi, ${cmd.name}`;
  }

  @commandHandler(FarewellCommand, 10)
  async farewell(cmd: FarewellCommand): Promise<string> {
    return `Bye, ${cmd.name}`;
  }
}

describe("@commandHandler decorator", () => {
  it("attaches handler metadata via COMMAND_HANDLER symbol", () => {
    const svc = new GreetingService();
    const defs: CommandHandlerDef[] = (svc as any)[COMMAND_HANDLER];

    expect(defs).toBeDefined();
    expect(defs).toHaveLength(1);
    expect(defs[0].commandType).toBe(GreetCommand);
    expect(defs[0].isFilter).toBe(false);
  });

  it("handler fn is bound to the service instance", async () => {
    const svc = new GreetingService();
    const defs: CommandHandlerDef[] = (svc as any)[COMMAND_HANDLER];

    const result = await defs[0].fn(new GreetCommand("World"), {} as any);
    expect(result).toBe("Hello, World!");
  });

  it("stores target reference to service instance", () => {
    const svc = new GreetingService();
    const defs: CommandHandlerDef[] = (svc as any)[COMMAND_HANDLER];

    expect(defs[0].target).toBe(svc);
  });

  it("supports multiple handlers on one service", () => {
    const svc = new MultiHandlerService();
    const defs: CommandHandlerDef[] = (svc as any)[COMMAND_HANDLER];

    expect(defs).toHaveLength(2);
    const types = defs.map((d) => d.commandType);
    expect(types).toContain(GreetCommand);
    expect(types).toContain(FarewellCommand);
  });

  it("preserves priority from decorator argument", () => {
    const svc = new MultiHandlerService();
    const defs: CommandHandlerDef[] = (svc as any)[COMMAND_HANDLER];

    const farewellDef = defs.find((d) => d.commandType === FarewellCommand);
    expect(farewellDef!.priority).toBe(10);
  });

  it("different instances have independent handler metadata", () => {
    const svc1 = new GreetingService();
    const svc2 = new GreetingService();

    const defs1: CommandHandlerDef[] = (svc1 as any)[COMMAND_HANDLER];
    const defs2: CommandHandlerDef[] = (svc2 as any)[COMMAND_HANDLER];

    expect(defs1[0].target).toBe(svc1);
    expect(defs2[0].target).toBe(svc2);
    expect(defs1[0].target).not.toBe(defs2[0].target);
  });
});
