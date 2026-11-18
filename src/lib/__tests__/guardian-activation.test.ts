jest.mock("@/lib/guardian-login", () => ({ GUARDIAN_DOMAIN: "guardian.rikaz.app" }), { virtual: true });
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ensureGuardianLoginEmail } = require("../../../docs/vps-guardian-activation/src/lib/guardian-activation.server");

function fakeAdmin(user: { id: string; email?: string | null } | null, lookup: { user_id: string }[] = []) {
  const updates: unknown[] = [];
  return {
    updates,
    auth: { admin: {
      getUserById: async () => ({ data: { user } }),
      updateUserById: async (_id: string, attrs: unknown) => { updates.push(attrs); return { error: null }; },
    } },
    rpc: async () => ({ data: lookup, error: null }),
  };
}

describe("guardian activation login email (review package, fake data)", () => {
  it("adds the platform guardian login address to a phone-only staged login", async () => {
    const sb = fakeAdmin({ id: "u1", email: null });
    expect(await ensureGuardianLoginEmail(sb, "u1", "1000000001")).toBe("ok");
    expect(sb.updates).toEqual([{ email: "1000000001@guardian.rikaz.app", email_confirm: true }]);
  });
  it("never replaces an existing email", async () => {
    const sb = fakeAdmin({ id: "u2", email: "x@example.com" });
    expect(await ensureGuardianLoginEmail(sb, "u2", "1000000002")).toBe("ok");
    expect(sb.updates).toEqual([]);
  });
  it("refuses when another login already owns that address", async () => {
    const sb = fakeAdmin({ id: "u3", email: null }, [{ user_id: "other" }]);
    expect(await ensureGuardianLoginEmail(sb, "u3", "1000000003")).toBe("conflict");
    expect(sb.updates).toEqual([]);
  });
  it("rejects a malformed ID", async () => {
    const sb = fakeAdmin({ id: "u4", email: null });
    expect(await ensureGuardianLoginEmail(sb, "u4", "123")).toBe("error");
  });
});
