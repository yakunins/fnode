/**
 * AuthService — abstract base for session/auth resolution.
 *
 * Concrete implementations provide storage (in-memory or DB-backed).
 * All query methods are @computed for dependency tracking + caching.
 *
 * Mirrors ActualLab.Fusion.Authentication.IAuth.
 */

import { computed } from "@fnode/fusion";
import type { Session } from "./session.js";
import type { User } from "./user.js";

export abstract class AuthService {
  @computed()
  async getUser(sessionId: string): Promise<User | undefined> {
    return this.getUserImpl(sessionId);
  }

  @computed()
  async getSession(sessionId: string): Promise<Session | undefined> {
    return this.getSessionImpl(sessionId);
  }

  /** Override in concrete implementations. */
  protected abstract getUserImpl(sessionId: string): Promise<User | undefined>;
  protected abstract getSessionImpl(
    sessionId: string,
  ): Promise<Session | undefined>;

  /** Sign in — concrete implementations handle storage + invalidation. */
  abstract signIn(sessionId: string, user: User): Promise<void>;

  /** Sign out — concrete implementations handle storage + invalidation. */
  abstract signOut(sessionId: string): Promise<void>;
}
