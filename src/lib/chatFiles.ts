/** تصنيف مرفقات الرسائل كما في المنصة: صوت، صورة، أو ملف. */
export const fileKind = (f: { mime?: string | null }) => (String(f.mime ?? "").startsWith("audio/") ? "voice" : String(f.mime ?? "").startsWith("image/") ? "image" : "file");
export const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
/** لا يُرسل التسجيل إذا تجاوز حجم المدرسة، والمدة لا تتجاوز الحد ولا تقل عن ثانية. */
export const clipSeconds = (secs: number, max: number) => Math.max(1, Math.min(secs, max));
