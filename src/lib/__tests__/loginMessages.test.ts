import { ORIGIN_BLOCKED_USER, REQUEST_INVALID_USER, serverLoginMessage } from "../loginMessages";

describe("sign-in server messages", () => {
  it("shows the server's message for an unregistered ID", () => {
    const msg = "تعذر إرسال رمز لهذا الرقم. إن استمرت المشكلة فتواصل مع إدارة المدرسة لتحديث بياناتك.";
    expect(serverLoginMessage(400, msg)).toBe(msg);
  });
  it("shows the wrong-portal message so the user can switch account type", () => {
    const msg = "هذا الحساب ليس حساب ولي أمر. استخدم بوابة «الإدارة والموظفون».";
    expect(serverLoginMessage(400, msg)).toBe(msg);
  });
  it("replaces the malformed-request reply with a clear instruction", () => {
    expect(serverLoginMessage(400, "بيانات الطلب غير صحيحة.")).toBe(REQUEST_INVALID_USER);
  });
  it("explains blocked origins instead of claiming wrong credentials", () => {
    expect(serverLoginMessage(403, "الطلب غير مسموح.")).toBe(ORIGIN_BLOCKED_USER);
  });
  it("never shows text containing long numbers such as phone or ID numbers", () => {
    expect(serverLoginMessage(400, "أُرسل الرمز إلى 0551234567")).toBeNull();
  });
  it("never shows technical or non-Arabic text", () => {
    expect(serverLoginMessage(400, "PostgrestError: relation does not exist")).toBeNull();
    expect(serverLoginMessage(400, "خطأ <html>")).toBeNull();
  });
  it("falls back to the generic message for server errors", () => {
    expect(serverLoginMessage(500, "تعذّر إتمام الدخول. حاول مرة أخرى.")).toBeNull();
  });
});
