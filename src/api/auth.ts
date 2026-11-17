import { supabase } from "./client";
import { CONFIG } from "../config";
import { clearActiveKey } from "../lib/storage";
import { digitsOnly, isValidEmail, isValidNationalId, isValidOtp } from "../lib/identity";

/**
 * طرق الدخول المعتمدة في المنصة (src/routes/auth.tsx):
 * - الطالب: رقم الهوية/الإقامة + رقم الطالب في C-Smart، بلا رمز.
 * - ولي الأمر، والإدارة والموظفون: رقم الهوية/الإقامة ثم رمز من 6 أرقام على واتساب للجوال المسجل.
 * - مالك المنصة: البريد وكلمة المرور، ثم التحقق من أنه مالك المنصة فعلًا.
 * الدخول بكلمة المرور للموظفين غير متاح في المنصة إلا للدعوات، فلا يُعرض هنا.
 */

export class LoginError extends Error {}

const MSG = {
  invalidId: "أدخل رقم هوية أو إقامة صحيحًا من 10 أرقام.",
  invalidCode: "أدخل الرمز المكوّن من 6 أرقام.",
  studentMissing: "أدخل رقم الهوية ورقم الطالب.",
  network: "تعذّر الاتصال بالخدمة. تأكد من الإنترنت ثم حاول مرة أخرى.",
  unavailable: "الدخول برقم الهوية غير متاح في التطبيق حاليًا. استخدم منصة ركاز على الويب.",
  server: "حدث خطأ غير متوقع. حاول مرة أخرى.",
  ownerEmail: "أدخل بريد مالك المنصة.",
  ownerPassword: "كلمة المرور 8 أحرف على الأقل.",
  badCredentials: "بيانات الدخول غير صحيحة.",
  notOwner: "هذا الحساب لا يملك صلاحية مالك المنصة.",
  rateLimited: "محاولات كثيرة؛ انتظر قليلًا ثم حاول مجددًا.",
};

type IdResponse = { error?: string; challenge?: string; masked?: string; token?: string };

/** نداء نقاط الدخول العامة في المنصة. الخادم يعيد رسائل عربية عامة لا تكشف أي سجل ناقص. */
async function callPlatform(path: string, body: Record<string, string>): Promise<IdResponse> {
  if (!CONFIG.idLoginEnabled) throw new LoginError(MSG.unavailable);
  let res: Response;
  try {
    res = await fetch(`${CONFIG.platformUrl}/api/public/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new LoginError(MSG.network);
  }
  if (res.status === 404) throw new LoginError(MSG.unavailable);
  let json: IdResponse;
  try {
    json = (await res.json()) as IdResponse;
  } catch {
    throw new LoginError(MSG.server);
  }
  if (json.error) throw new LoginError(json.error);
  if (!res.ok) throw new LoginError(MSG.server);
  return json;
}

/** فتح حساب موجود برمز الدخول لمرة واحدة، بعد مسح أي جلسة أو صفة سابقة (كما في المنصة) */
async function openWithToken(token: string) {
  await supabase.auth.signOut({ scope: "local" });
  await clearActiveKey();
  const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: "magiclink" });
  if (error) throw new LoginError(MSG.server);
}

export async function studentSignIn(nidInput: string, csmartInput: string) {
  const nid = digitsOnly(nidInput);
  const csmart = csmartInput.trim().slice(0, 40);
  if (!nid || !csmart) throw new LoginError(MSG.studentMissing);
  if (!isValidNationalId(nid)) throw new LoginError(MSG.invalidId);
  const r = await callPlatform("student-login", { nid, csmart });
  if (!r.token) throw new LoginError(MSG.server);
  await openWithToken(r.token);
}

export async function requestIdCode(nidInput: string, portal: "guardian" | "staff") {
  const nid = digitsOnly(nidInput);
  if (!isValidNationalId(nid)) throw new LoginError(MSG.invalidId);
  const r = await callPlatform("request-code", { nid, portal });
  if (!r.challenge) throw new LoginError(MSG.server);
  return { challenge: r.challenge, masked: r.masked ?? "" };
}

export async function verifyIdCode(challenge: string, codeInput: string, portal: "guardian" | "staff") {
  const code = digitsOnly(codeInput, 6);
  if (!isValidOtp(code)) throw new LoginError(MSG.invalidCode);
  const r = await callPlatform("verify-code", { challenge, code, portal });
  if (!r.token) throw new LoginError(MSG.server);
  await openWithToken(r.token);
}

/** مالك المنصة: كلمة مروره الخاصة، ثم التأكد من سجله في platform_admins وإلا يُخرج فورًا */
export async function platformOwnerSignIn(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  if (!isValidEmail(email)) throw new LoginError(MSG.ownerEmail);
  if (password.length < 8) throw new LoginError(MSG.ownerPassword);
  await supabase.auth.signOut({ scope: "local" });
  await clearActiveKey();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/rate limit|too many/i.test(error.message)) throw new LoginError(MSG.rateLimited);
    if (/fetch|network/i.test(error.message)) throw new LoginError(MSG.network);
    throw new LoginError(MSG.badCredentials);
  }
  const { data: admin, error: roleError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (roleError || !admin) {
    await supabase.auth.signOut();
    throw new LoginError(MSG.notOwner);
  }
}

export function loginErrorMessage(e: unknown): string {
  return e instanceof LoginError ? e.message : MSG.server;
}
