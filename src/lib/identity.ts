/** قواعد إدخال الهوية والرموز، مطابقة لتحقق المنصة (src/lib/id-login.functions.ts). */

/** أرقام فقط بحد أقصى 10، مع تحويل الأرقام العربية والفارسية إلى لاتينية */
export function digitsOnly(input: string, max = 10): string {
  const latin = input
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  return latin.replace(/\D/g, "").slice(0, max);
}

/** هوية وطنية تبدأ بـ1 أو إقامة تبدأ بـ2، من 10 أرقام */
export function isValidNationalId(nid: string): boolean {
  return /^[12]\d{9}$/.test(nid);
}

export function isValidOtp(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function isValidEmail(v: string): boolean {
  return /^\S+@\S+\.\S+$/.test(v.trim());
}

/** نطاقات البريد الداخلية التي تنشئها المنصة للحسابات؛ لا تُعرض للمستخدم */
const INTERNAL_DOMAINS = ["staff.rikaz.app", "guardian.rikaz.app", "student.rikaz.app"];
export function displayableEmail(email?: string | null): string | null {
  if (!email) return null;
  const domain = email.split("@")[1]?.toLowerCase();
  return domain && INTERNAL_DOMAINS.includes(domain) ? null : email;
}

/** مدة الانتظار قبل إعادة إرسال الرمز؛ الخادم يرفض الطلب قبل دقيقة («cooldown») */
export const RESEND_SECONDS = 60;
