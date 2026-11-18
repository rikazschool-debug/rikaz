// REVIEW PACKAGE ONLY — replacement for verifyIdCode in src/lib/id-login.server.ts (rest of the file unchanged).
// Diff vs current: reads `needs_login_email` / `login_nid` from _idl_verify and calls ensureGuardianLoginEmail before tokenFor.
import { ensureGuardianLoginEmail } from "@/lib/guardian-activation.server";

export async function verifyIdCode(data: { challenge: string; code: string; portal: Portal }) {
  if (!UUID.test(data.challenge) || data.code.length !== 6)
    return { error: idLoginMessage("wrong") };
  const sb = await admin();
  const { data: r, error } = await sb.rpc(
    "_idl_verify" as never,
    { _challenge: data.challenge, _code: data.code } as never,
  );
  if (error) return { error: idLoginMessage("server") };
  const res = r as { error?: string; user_id?: string; needs_login_email?: boolean; login_nid?: string };
  if (res.error || !res.user_id) return { error: idLoginMessage(res.error ?? "server") };
  if (!(await portalOk(res.user_id, data.portal))) return { error: WRONG_PORTAL[data.portal] };
  if (res.needs_login_email) {
    // only accounts activated by the ID flow reach here; already-active guardians and staff never do
    const e = await ensureGuardianLoginEmail(sb as never, res.user_id, res.login_nid ?? "");
    if (e !== "ok") return { error: idLoginMessage(e === "conflict" ? "conflict_account" : "server") };
  }
  return tokenFor(res.user_id);
}
