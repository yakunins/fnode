/**
 * User — authenticated user identity.
 *
 * Minimal port of ActualLab.Fusion.Authentication.User.
 */

export interface User {
  readonly id: string;
  readonly name: string;
  readonly claims: ReadonlyMap<string, string>;
}
