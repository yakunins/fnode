/**
 * InMemoryAuthService — simple in-memory implementation of AuthService.
 *
 * Useful for testing and samples that don't need DB persistence.
 */

import { Invalidation } from "@fnodejs/fusion";
import { Session } from "./session.js";
import type { User } from "./user.js";
import { AuthService } from "./auth-service.js";

export class InMemoryAuthService extends AuthService {
  readonly #sessions = new Map<string, Session>();
  readonly #users = new Map<string, User>(); // sessionId -> User

  protected async getUserImpl(sessionId: string): Promise<User | undefined> {
    return this.#users.get(sessionId);
  }

  protected async getSessionImpl(
    sessionId: string,
  ): Promise<Session | undefined> {
    return this.#sessions.get(sessionId);
  }

  async signIn(sessionId: string, user: User): Promise<void> {
    this.#sessions.set(sessionId, new Session(sessionId));
    this.#users.set(sessionId, user);
    using _ = Invalidation.begin();
    this.getUser(sessionId);
    this.getSession(sessionId);
  }

  async signOut(sessionId: string): Promise<void> {
    this.#sessions.delete(sessionId);
    this.#users.delete(sessionId);
    using _ = Invalidation.begin();
    this.getUser(sessionId);
    this.getSession(sessionId);
  }
}
