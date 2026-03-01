/**
 * CommandContext — ambient context for the currently executing command.
 *
 * Mirrors ActualLab.Fusion CommandContext:
 * - Tracks current command, handler, nesting
 * - Propagated via AsyncLocalStorage (like C# AsyncLocal)
 * - Nested commands share the outermost items bag
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { CommandHandlerDef } from "./command-handler.js";

export class CommandContext {
  static readonly #storage = new AsyncLocalStorage<CommandContext>();

  /** The command being executed. */
  readonly command: unknown;

  /** The outer context when commands are nested. */
  readonly outerContext?: CommandContext;

  /** Shared key-value bag. Nested contexts share the outermost items. */
  readonly items: Map<string, unknown>;

  /** The resolved handler definition (set by Commander for invalidation re-invoke). */
  handler?: CommandHandlerDef;

  constructor(command: unknown, outerContext?: CommandContext) {
    this.command = command;
    this.outerContext = outerContext;
    // Share items bag with outermost context
    this.items = outerContext?.items ?? new Map();
  }

  /** Get the current CommandContext, or undefined if not inside a command. */
  static get current(): CommandContext | undefined {
    return CommandContext.#storage.getStore();
  }

  /**
   * Run `fn` within this command context.
   * Propagates through async chains via AsyncLocalStorage.
   */
  run<R>(fn: () => R): R {
    return CommandContext.#storage.run(this, fn);
  }
}
