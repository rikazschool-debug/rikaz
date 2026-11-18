import {
  authDiagnosticDetails,
  authFailureSummary,
  formatAuthFailure,
  logAuthDiagnostic,
} from "../authDiagnostics";

describe("redacted auth diagnostics", () => {
  it("keeps status and a bounded code, but drops error messages", () => {
    expect(
      authDiagnosticDetails({
        status: 403,
        code: "42501",
        message: "personal data and token must not be logged",
      }),
    ).toEqual({ status: 403, code: "42501" });

    expect(authDiagnosticDetails({ status: 200, code: "phone:123456789" })).toEqual({
      status: 200,
    });
    expect(authDiagnosticDetails({ status: 777, message: "private" })).toEqual({});
  });

  it("formats only a fixed stage and HTTP status for the visible error", () => {
    const failure = authFailureSummary(
      { status: 403, message: "private identity and bearer token" },
      "memberships",
    );
    expect(formatAuthFailure(failure)).toBe(
      "مرحلة الفشل: جلب العضويات · رمز الاستجابة: HTTP 403",
    );
    expect(formatAuthFailure({ stage: "request-code" })).toBe(
      "مرحلة الفشل: طلب رمز التحقق · رمز الاستجابة: لا يوجد رد HTTP",
    );
  });

  it("writes only the fixed stage, result, status, and code", () => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    const previous = runtime.__DEV__;
    runtime.__DEV__ = true;
    const info = jest.spyOn(console, "info").mockImplementation(() => undefined);

    try {
      logAuthDiagnostic("student-login", "http-error", { status: 401, code: "invalid" });
      expect(info).toHaveBeenCalledWith(
        "[RikazAuth] stage=student-login result=http-error status=401 code=invalid",
      );
    } finally {
      info.mockRestore();
      if (previous === undefined) delete runtime.__DEV__;
      else runtime.__DEV__ = previous;
    }
  });
});
