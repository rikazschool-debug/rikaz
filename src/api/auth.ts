import { supabase } from "./client";
import { CONFIG } from "../config";
import { clearActiveKey } from "../lib/storage";
import { digitsOnly, isValidEmail, isValidNationalId, isValidOtp } from "../lib/identity";
import {
  authDiagnosticDetails,
  authFailureSummary,
  formatAuthFailure,
  logAuthDiagnostic,
  type AuthFailureSummary,
} from "../lib/authDiagnostics";
import { serverLoginMessage } from "../lib/loginMessages";

/**
 * طرق الدخول المعتمدة في المنصة (src/routes/auth.tsx):
 * - الطالب: رقم الهوية/الإقامة + رقم الطالب في C-Smart، بلا رمز.
 * - ولي الأمر، والإدارة والموظفون: رقم الهوية/الإقامة ثم رمز من 6 أرقام على واتساب للجوال المسجل.
 * - مالك المنصة: البريد وكلمة المرور، ثم التحقق من أنه مالك المنصة فعلًا.
 * الدخول بكلمة المرور للموظفين غير متاح في المنصة إلا للدعوات، فلا يُعرض هنا.
 */

export class LoginError extends Error {
  constructor(
    message: string,
    readonly failure?: AuthFailureSummary,
  ) {
    super(message);
    this.name = "LoginError";
  }
}

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
type IdAuthResult = { body: IdResponse; status: number };

/** نداء نقاط الدخول العامة في المنصة. الخادم يعيد رسائل عربية عامة لا تكشف أي سجل ناقص. */
type IdAuthPath = "student-login" | "request-code" | "verify-code";

async function callPlatform(path: IdAuthPath, body: Record<string, string>): Promise<IdAuthResult> {
  if (!CONFIG.idLoginEnabled) throw new LoginError(MSG.unavailable, { stage: path });
  let res: Response;
  logAuthDiagnostic(path, "request-started");
  try {
    res = await fetch(`${CONFIG.authUrl}/api/public/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    logAuthDiagnostic(path, "network-error");
    throw new LoginError(MSG.network, { stage: path });
  }
  if (res.status === 404 || res.status === 503) {
    logAuthDiagnostic(path, "http-error", { status: res.status });
    throw new LoginError(MSG.unavailable, { stage: path, status: res.status });
  }
  if (res.status === 429) {
    logAuthDiagnostic(path, "http-error", { status: res.status });
    throw new LoginError(MSG.rateLimited, { stage: path, status: res.status });
  }
  let json: IdResponse;
  try {
    json = (await res.json()) as IdResponse;
  } catch {
    logAuthDiagnostic(path, "invalid-json", { status: res.status });
    throw new LoginError(MSG.server, { stage: path, status: res.status });
  }
  if (json.error) {
    logAuthDiagnostic(path, "api-error", { status: res.status });
    // رسائل الخادم العامة (رقم غير مسجل، بوابة خاطئة، رمز خاطئ) تُعرض كما هي بلا رمز تقني.
    const shown = serverLoginMessage(res.status, json.error);
    if (shown) throw new LoginError(shown);
    throw new LoginError(MSG.server, { stage: path, status: res.status });
  }
  if (!res.ok) {
    logAuthDiagnostic(path, "http-error", { status: res.status });
    throw new LoginError(MSG.server, { stage: path, status: res.status });
  }
  logAuthDiagnostic(path, "http-success", { status: res.status });
  return { body: json, status: res.status };
}

/** فتح الحساب برمز مؤقت مع الحفاظ على تفضيل السياق المحلي أثناء اختبار القراءة فقط */
async function openWithToken(token: string) {
  await supabase.auth.signOut({ scope: "local" });
  if (!CONFIG.readOnlyLoginTest) await clearActiveKey();
  let session;
  try {
    const result = await supabase.auth.verifyOtp({ token_hash: token, type: "magiclink" });
    if (result.error) throw result.error;
    session = result.data.session;
  } catch (error) {
    logAuthDiagnostic("session", "failure", authDiagnosticDetails(error));
    throw new LoginError(MSG.server, authFailureSummary(error, "session"));
  }
  if (!session) {
    logAuthDiagnostic("session", "failure");
    throw new LoginError(MSG.server, { stage: "session" });
  }
  logAuthDiagnostic("session", "success");
}

export async function studentSignIn(nidInput: string, csmartInput: string) {
  if (!CONFIG.studentLoginEnabled) throw new LoginError(MSG.unavailable);
  const nid = digitsOnly(nidInput);
  const csmart = csmartInput.trim().slice(0, 40);
  if (!nid || !csmart) throw new LoginError(MSG.studentMissing);
  if (!isValidNationalId(nid)) throw new LoginError(MSG.invalidId);
  const result = await callPlatform("student-login", { nid, csmart });
  if (!result.body.token) {
    throw new LoginError(MSG.server, { stage: "student-login", status: result.status });
  }
  await openWithToken(result.body.token);
}

export async function requestIdCode(nidInput: string, portal: "guardian" | "staff") {
  const nid = digitsOnly(nidInput);
  if (!isValidNationalId(nid)) throw new LoginError(MSG.invalidId);
  const result = await callPlatform("request-code", { nid, portal });
  if (!result.body.challenge) {
    throw new LoginError(MSG.server, { stage: "request-code", status: result.status });
  }
  return { challenge: result.body.challenge, masked: result.body.masked ?? "" };
}

export async function verifyIdCode(challenge: string, codeInput: string, portal: "guardian" | "staff") {
  const code = digitsOnly(codeInput, 6);
  if (!isValidOtp(code)) throw new LoginError(MSG.invalidCode);
  const result = await callPlatform("verify-code", { challenge, code, portal });
  if (!result.body.token) {
    throw new LoginError(MSG.server, { stage: "verify-code", status: result.status });
  }
  await openWithToken(result.body.token);
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
  if (!(e instanceof LoginError)) return MSG.server;
  return e.failure ? `${e.message}\n${formatAuthFailure(e.failure)}` : e.message;
}
