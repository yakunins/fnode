/**
 * @commandHandler — decorator that marks a method as a command handler.
 *
 * Mirrors ActualLab.Fusion [CommandHandler] attribute:
 * - Associates a method with a command type (by constructor)
 * - Commander scans services for decorated methods via COMMAND_HANDLER symbol
 *
 * Usage:
 *   @commandHandler(AddItemCommand)
 *   async addItem(cmd: AddItemCommand): Promise<void> { ... }
 */

import type { CommandContext } from "./command-context.js";

/** Symbol key used to store handler metadata on service instances. */
export const COMMAND_HANDLER = Symbol.for("fnode.commandHandler");

/** Metadata for a registered command handler. */
export interface CommandHandlerDef {
  /** The command class constructor used for resolution. */
  commandType: Function;
  /** The handler function. */
  fn: (command: any, context: CommandContext) => Promise<any>;
  /** The service instance (for re-invocation in invalidation scope). */
  target?: object;
  /** Whether this is a filter (middleware) rather than a terminal handler. */
  isFilter: boolean;
  /** Priority for ordering (higher = runs first/outermost). */
  priority: number;
}

/** Middleware function signature for command pipeline filters. */
export type CommandMiddleware = (
  command: unknown,
  context: CommandContext,
  next: () => Promise<unknown>,
) => Promise<unknown>;

/**
 * Decorator: marks a method as a command handler for the given command type.
 *
 * @param commandType The command class constructor to handle
 * @param priority Optional priority (default 0). Higher = runs first for filters.
 */
export function commandHandler(commandType: Function, priority = 0) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: T,
    context: ClassMethodDecoratorContext,
  ): T {
    context.addInitializer(function (this: any) {
      const handlers: CommandHandlerDef[] = this[COMMAND_HANDLER] ?? [];
      handlers.push({
        commandType,
        fn: target.bind(this),
        target: this,
        isFilter: false,
        priority,
      });
      this[COMMAND_HANDLER] = handlers;
    });
    return target;
  };
}
