import { describe, it, expect } from "vitest";
import { CommandContext } from "../src/index.js";

class TestCommand {
  constructor(readonly value: string) {}
}

describe("CommandContext", () => {
  it("is undefined outside of a command", () => {
    expect(CommandContext.current).toBeUndefined();
  });

  it("provides ambient access within run()", async () => {
    const cmd = new TestCommand("hello");
    const ctx = new CommandContext(cmd);

    const result = await ctx.run(async () => {
      const current = CommandContext.current;
      expect(current).toBe(ctx);
      expect(current!.command).toBe(cmd);
      return "done";
    });

    expect(result).toBe("done");
  });

  it("propagates through async chains", async () => {
    const cmd = new TestCommand("async");
    const ctx = new CommandContext(cmd);

    await ctx.run(async () => {
      await new Promise((r) => setTimeout(r, 10));
      expect(CommandContext.current).toBe(ctx);
    });
  });

  it("supports nesting with outerContext link", async () => {
    const outerCmd = new TestCommand("outer");
    const innerCmd = new TestCommand("inner");

    const outerCtx = new CommandContext(outerCmd);

    await outerCtx.run(async () => {
      expect(CommandContext.current).toBe(outerCtx);

      const innerCtx = new CommandContext(innerCmd, outerCtx);
      await innerCtx.run(async () => {
        expect(CommandContext.current).toBe(innerCtx);
        expect(innerCtx.outerContext).toBe(outerCtx);
        expect(innerCtx.command).toBe(innerCmd);
      });

      // Outer context restored after inner run
      expect(CommandContext.current).toBe(outerCtx);
    });
  });

  it("shares items bag with nested contexts", () => {
    const outerCtx = new CommandContext(new TestCommand("outer"));
    outerCtx.items.set("key", "value");

    const innerCtx = new CommandContext(new TestCommand("inner"), outerCtx);

    expect(innerCtx.items).toBe(outerCtx.items);
    expect(innerCtx.items.get("key")).toBe("value");

    innerCtx.items.set("inner-key", 42);
    expect(outerCtx.items.get("inner-key")).toBe(42);
  });
});
