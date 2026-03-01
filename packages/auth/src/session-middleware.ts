/**
 * SessionMiddleware — extracts Session from command and stores in CommandContext.items.
 *
 * Commands that implement ISessionCommand (have a .session field) get
 * their session propagated to downstream handlers via the context items bag.
 */

import type { CommandMiddleware } from "@fnode/commandr";
import type { Session } from "./session.js";

export const SESSION_KEY = "fnode.session";

/** Type guard for commands that carry a session. */
export function hasSession(command: unknown): command is { session: Session } {
  return (
    command !== null &&
    typeof command === "object" &&
    "session" in command &&
    (command as any).session != null
  );
}

/**
 * Creates a middleware that extracts session from commands into CommandContext.items.
 */
export function createSessionMiddleware(): CommandMiddleware {
  return async (command, context, next) => {
    if (hasSession(command)) {
      context.items.set(SESSION_KEY, command.session);
    }
    return next();
  };
}
