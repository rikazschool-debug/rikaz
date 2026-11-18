/**
 * تحويل رد خدمة الدخول إلى رسالة تُعرض للمستخدم.
 * الخادم يعيد رسائل عربية عامة مصممة للعرض (رقم غير مسجل، بوابة خاطئة، رمز غير صحيح، انتظار).
 * نعرضها كما هي بعد فحص أمان بسيط، ولا نعرض أي نص قد يحمل أرقامًا طويلة أو تفاصيل تقنية.
 */
export const REQUEST_INVALID_SERVER = "بيانات الطلب غير صحيحة.";
export const REQUEST_INVALID_USER = "تحقق من الرقم المدخل ثم حاول مرة أخرى.";
export const ORIGIN_BLOCKED_USER = "الدخول متاح من تطبيق ركاز على الجوال فقط.";

const ARABIC = /[\u0600-\u06FF]/;
const LONG_DIGITS = /[0-9\u0660-\u0669\u06F0-\u06F9]{4,}/;
const TECHNICAL = /[<>{}]|https?:|error|exception|sql|stack/i;

export function serverLoginMessage(status: number, error: unknown): string | null {
  if (status === 403) return ORIGIN_BLOCKED_USER;
  if (status !== 400 || typeof error !== "string") return null;
  const text = error.trim();
  if (!text || text.length > 220 || !ARABIC.test(text) || LONG_DIGITS.test(text) || TECHNICAL.test(text)) return null;
  return text === REQUEST_INVALID_SERVER ? REQUEST_INVALID_USER : text;
}
