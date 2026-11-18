export type AuthDiagnosticStage =
  | "student-login"
  | "request-code"
  | "verify-code"
  | "session"
  | "invitation-acceptance"
  | "memberships"
  | "school-context"
  | "membership-titles"
  | "active-context"
  | "permissions"
  | "context-load";

export type AuthDiagnosticResult =
  | "request-started"
  | "http-success"
  | "http-error"
  | "network-error"
  | "invalid-json"
  | "api-error"
  | "success"
  | "failure"
  | "skipped";

export interface AuthDiagnosticDetails {
  status?: number;
  code?: string;
}

export interface AuthFailureSummary {
  stage: AuthDiagnosticStage;
  status?: number;
}

/** Safe error marker used to carry only a fixed stage and HTTP status to the UI. */
export class AuthStageError extends Error {
  constructor(
    readonly stage: AuthDiagnosticStage,
    readonly status?: number,
  ) {
    super("Authentication stage failed");
    this.name = "AuthStageError";
  }
}

const AUTH_STAGE_LABELS: Record<AuthDiagnosticStage, string> = {
  "student-login": "دخول الطالب",
  "request-code": "طلب رمز التحقق",
  "verify-code": "التحقق من الرمز",
  session: "إنشاء جلسة الدخول",
  "invitation-acceptance": "قبول الدعوات",
  memberships: "جلب العضويات",
  "school-context": "جلب سياق المدرسة",
  "membership-titles": "جلب المسميات",
  "active-context": "تحديث السياق النشط",
  permissions: "جلب الصلاحيات",
  "context-load": "تحميل سياق الحساب",
};

/** Returns only a fixed stage and a validated HTTP status; never carries error text. */
export function authFailureSummary(
  error: unknown,
  fallbackStage: AuthDiagnosticStage,
): AuthFailureSummary {
  const stage = error instanceof AuthStageError ? error.stage : fallbackStage;
  const status = authDiagnosticDetails(error).status;
  return status === undefined ? { stage } : { stage, status };
}

export function formatAuthFailure(failure: AuthFailureSummary): string {
  const stage = AUTH_STAGE_LABELS[failure.stage];
  const hasStatus = Number.isInteger(failure.status) && failure.status! >= 100 && failure.status! <= 599;
  const response = hasStatus ? `HTTP ${failure.status}` : "لا يوجد رد HTTP";
  return `مرحلة الفشل: ${stage} · رمز الاستجابة: ${response}`;
}

/** Development-only, redacted diagnostics. Never pass request or response bodies. */
export function logAuthDiagnostic(
  stage: AuthDiagnosticStage,
  result: AuthDiagnosticResult,
  details: AuthDiagnosticDetails = {},
): void {
  if (typeof __DEV__ === "undefined" || !__DEV__) return;

  const parts = [`[RikazAuth] stage=${stage}`, `result=${result}`];
  if (Number.isInteger(details.status) && details.status! >= 100 && details.status! <= 599) {
    parts.push(`status=${details.status}`);
  }
  if (details.code && /^[A-Za-z0-9_.-]{1,32}$/.test(details.code)) {
    parts.push(`code=${details.code}`);
  }
  console.info(parts.join(" "));
}

/** Extract only bounded status/code fields; discard all messages and payloads. */
export function authDiagnosticDetails(error: unknown): AuthDiagnosticDetails {
  if (!error || typeof error !== "object") return {};
  const candidate = error as { status?: unknown; code?: unknown };
  const details: AuthDiagnosticDetails = {};
  if (
    typeof candidate.status === "number" &&
    Number.isInteger(candidate.status) &&
    candidate.status >= 100 &&
    candidate.status <= 599
  ) {
    details.status = candidate.status;
  }
  if (typeof candidate.code === "string" && /^[A-Za-z0-9_.-]{1,32}$/.test(candidate.code)) {
    details.code = candidate.code;
  }
  return details;
}
