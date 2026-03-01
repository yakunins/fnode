/**
 * Session — opaque token identifying a client session.
 *
 * Mirrors ActualLab.Fusion.Authentication.Session:
 * lightweight immutable wrapper around a session ID string.
 */

export class Session {
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  static create(): Session {
    return new Session(crypto.randomUUID());
  }

  toString(): string {
    return `Session(${this.id})`;
  }
}
