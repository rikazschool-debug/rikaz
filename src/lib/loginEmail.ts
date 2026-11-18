/**
 * نفس تحويل حقل الدخول في موقع ركاز (src/lib/guardian-login.ts بالمنصة):
 * أرقام (هوية أو جوال) → حساب ولي الأمر، اسم مستخدم → حساب موظف أنشأه المالك، وإلا البريد كما هو.
 */
export const STAFF_DOMAIN = "staff.rikaz.app";
export const GUARDIAN_DOMAIN = "guardian.rikaz.app";
export function toLoginEmail(input: string): string {
  const v = input.trim();
  if (/^[\d\s+-]{6,}$/.test(v)) return `${v.replace(/\D/g, "")}@${GUARDIAN_DOMAIN}`;
  if (!v.includes("@") && /^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/.test(v)) return `${v.toLowerCase()}@${STAFF_DOMAIN}`;
  return v.toLowerCase();
}
