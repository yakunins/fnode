import { describe, it, expect, beforeEach } from "vitest";
import { Session, InMemoryAuthService } from "../src/index.js";
import type { User } from "../src/index.js";

describe("Session", () => {
  it("creates session with given id", () => {
    const s = new Session("abc-123");
    expect(s.id).toBe("abc-123");
  });

  it("creates session with random UUID", () => {
    const s1 = Session.create();
    const s2 = Session.create();
    expect(s1.id).not.toBe(s2.id);
    expect(s1.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("toString includes id", () => {
    const s = new Session("test-id");
    expect(s.toString()).toBe("Session(test-id)");
  });
});

describe("InMemoryAuthService", () => {
  let authService: InMemoryAuthService;
  const testUser: User = {
    id: "u1",
    name: "Alice",
    claims: new Map([["role", "admin"]]),
  };

  beforeEach(() => {
    authService = new InMemoryAuthService();
  });

  it("returns undefined for unknown session", async () => {
    expect(await authService.getUser("unknown")).toBeUndefined();
    expect(await authService.getSession("unknown")).toBeUndefined();
  });

  it("signIn stores user and session", async () => {
    const sessionId = "s1";
    await authService.signIn(sessionId, testUser);

    const user = await authService.getUser(sessionId);
    expect(user).toEqual(testUser);

    const session = await authService.getSession(sessionId);
    expect(session).toBeDefined();
    expect(session!.id).toBe(sessionId);
  });

  it("signOut removes user and session", async () => {
    const sessionId = "s1";
    await authService.signIn(sessionId, testUser);

    // Verify signed in
    expect(await authService.getUser(sessionId)).toEqual(testUser);

    await authService.signOut(sessionId);

    // After sign out, queries should return undefined
    expect(await authService.getUser(sessionId)).toBeUndefined();
    expect(await authService.getSession(sessionId)).toBeUndefined();
  });

  it("getUser is @computed — returns cached value", async () => {
    const sessionId = "s1";
    await authService.signIn(sessionId, testUser);

    const user1 = await authService.getUser(sessionId);
    const user2 = await authService.getUser(sessionId);
    // Same cached result
    expect(user1).toBe(user2);
  });

  it("signIn invalidates cached getUser", async () => {
    const sessionId = "s1";

    // First call returns undefined (cached)
    const before = await authService.getUser(sessionId);
    expect(before).toBeUndefined();

    // Sign in should invalidate the cached undefined
    await authService.signIn(sessionId, testUser);

    const after = await authService.getUser(sessionId);
    expect(after).toEqual(testUser);
  });

  it("supports multiple sessions", async () => {
    const user2: User = {
      id: "u2",
      name: "Bob",
      claims: new Map(),
    };

    await authService.signIn("s1", testUser);
    await authService.signIn("s2", user2);

    expect((await authService.getUser("s1"))?.name).toBe("Alice");
    expect((await authService.getUser("s2"))?.name).toBe("Bob");

    await authService.signOut("s1");
    expect(await authService.getUser("s1")).toBeUndefined();
    expect((await authService.getUser("s2"))?.name).toBe("Bob");
  });
});
