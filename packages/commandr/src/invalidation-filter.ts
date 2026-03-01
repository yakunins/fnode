/**
 * InvalidationMiddleware — automatically re-invokes the handler in invalidation scope.
 *
 * Mirrors ActualLab.Fusion InvalidatingCommandCompletionHandler:
 * - After the handler completes, enters Invalidation.begin() scope
 * - Re-invokes the handler so @computed calls invalidate cached values
 * - This is what makes "write command handler once, get invalidation for free" work
 */

import { Invalidation } from "@fnode/fusion";
import type { CommandMiddleware } from "./command-handler.js";

/** Default priority for the invalidation middleware. */
export const INVALIDATION_FILTER_PRIORITY = 100;

/**
 * Built-in middleware that handles automatic invalidation after command execution.
 */
export const InvalidationMiddleware: CommandMiddleware = async (
  command,
  context,
  next,
) => {
  // Execute the actual handler
  const result = await next();

  // Re-invoke handler in invalidation scope
  const handler = context.handler;
  if (handler) {
    using _ = Invalidation.begin();
    await handler.fn.call(handler.target, command, context);
  }

  return result;
};
