import { mobileLoginHandler } from "../../../docs/vps-auth-overlay/src/lib/mobile-login-http";

 describe("reviewed VPS HTTP boundary (not a real sign-in)", () => {
  const methods = () => ({
    requestIdCode: jest.fn(async () => ({ challenge: "approved-challenge", masked: "•••123" })),
    verifyIdCode: jest.fn(async () => ({ token: "test-only-token" })),
    studentSignIn: jest.fn(async () => ({ token: "test-only-token" })),
  });
  const request = (body: object) => new Request("https://app.kalmalki.com/api/public/auth/student-login", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  it("uses the existing student credential verifier before issuing a token", async () => {
    const service = methods();
    const response = await mobileLoginHandler(request({ nid: "1012345678", csmart: "TEST-STUDENT" }), "student-login", service);
    expect(service.studentSignIn).toHaveBeenCalledWith({ nid: "1012345678", csmart: "TEST-STUDENT" });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects unsupported portals before any identity lookup", async () => {
    const service = methods();
    const response = await mobileLoginHandler(request({ nid: "1012345678", portal: "platform_admin" }), "request-code", service);
    expect(response.status).toBe(400);
    expect(service.requestIdCode).not.toHaveBeenCalled();
  });
  it("requires a six-digit code and a challenge UUID", async () => {
    const service = methods();
    expect((await mobileLoginHandler(request({ challenge: "11111111-1111-4111-8111-111111111111", code: "12345", portal: "guardian" }), "verify-code", service)).status).toBe(400);
    expect(service.verifyIdCode).not.toHaveBeenCalled();
  });
  it("rejects unexpected fields and oversized input before calling the service", async () => {
    const service = methods();
    expect((await mobileLoginHandler(request({ nid: "1012345678", csmart: "123", user_id: "injected" }), "student-login", service)).status).toBe(400);
    expect((await mobileLoginHandler(request({ nid: "1012345678", csmart: "x".repeat(3000) }), "student-login", service)).status).toBe(400);
    expect(service.studentSignIn).not.toHaveBeenCalled();
  });
});
