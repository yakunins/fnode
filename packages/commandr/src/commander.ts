/**
 * Commander — command bus with middleware pipeline.
 *
 * Mirrors ActualLab.Fusion ICommander:
 * - Resolves handlers by command constructor
 * - Builds middleware pipeline per call: filters (by priority desc) → handler
 * - InvalidationMiddleware auto-registered at priority 100
 *
 * Usage:
 *   const commander = new Commander();
 *   commander.addService(cartService);
 *   await commander.call(new AddItemCommand("u1", item));
 */

import {
  COMMAND_HANDLER,
  type CommandHandlerDef,
  type CommandMiddleware,
} from "./command-handler.js";
import { CommandContext } from "./command-context.js";
import {
  InvalidationMiddleware,
  INVALIDATION_FILTER_PRIORITY,
} from "./invalidation-filter.js";

interface FilterEntry {
  filter: CommandMiddleware;
  priority: number;
}

export class Commander {
  readonly #handlers = new Map<Function, CommandHandlerDef>();
  readonly #filters: FilterEntry[] = [];

  constructor() {
    // Auto-register InvalidationMiddleware
    this.addFilter(InvalidationMiddleware, INVALIDATION_FILTER_PRIORITY);
  }

  /**
   * Register a handler function for a command type.
   */
  addHandler<TCmd>(
    type: new (...a: any[]) => TCmd,
    fn: (command: TCmd, context: CommandContext) => Promise<any>,
    target?: object,
  ): void {
    this.#handlers.set(type, {
      commandType: type,
      fn: fn as any,
      target,
      isFilter: false,
      priority: 0,
    });
  }

  /**
   * Register a middleware filter.
   * Higher priority = runs first (outermost in the pipeline).
   */
  addFilter(filter: CommandMiddleware, priority = 0): void {
    this.#filters.push({ filter, priority });
    // Keep sorted descending by priority
    this.#filters.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Scan a service instance for @commandHandler-decorated methods and register them.
   */
  addService(service: object): void {
    const defs: CommandHandlerDef[] | undefined =
      (service as any)[COMMAND_HANDLER];
    if (!defs || defs.length === 0) {
      return;
    }
    for (const def of defs) {
      this.#handlers.set(def.commandType, def);
    }
  }

  /**
   * Execute a command through the middleware pipeline.
   * Returns the handler's result.
   */
  async call<TResult = void>(command: object): Promise<TResult> {
    const commandType = command.constructor;
    const handler = this.#handlers.get(commandType);
    if (!handler) {
      throw new Error(
        `No handler registered for command: ${commandType.name}`,
      );
    }

    // Build context (supports nesting)
    const outerContext = CommandContext.current;
    const context = new CommandContext(command, outerContext);
    context.handler = handler;

    // Build pipeline: filters → handler
    const filters = this.#filters;
    let index = 0;

    const next = async (): Promise<unknown> => {
      if (index < filters.length) {
        const entry = filters[index++];
        return entry.filter(command, context, next);
      }
      // Terminal: invoke the actual handler
      return handler.fn.call(handler.target, command, context);
    };

    return context.run(() => next()) as Promise<TResult>;
  }
}
