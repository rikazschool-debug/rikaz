type Portal = "guardian" | "staff";
type Result = { error?: string; token?: string; challenge?: string; masked?: string };
type Service = {
  requestIdCode: (data: { nid: string; portal: Portal }) => Promise<Result>;
  verifyIdCode: (data: { challenge: string; code: string; portal: Portal }) => Promise<Result>;
  studentSignIn: (data: { nid: string; csmart: string }) => Promise<Result>;
};
type Path = "request-code" | "verify-code" | "student-login";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const reply = (body: Result, status: number) => Response.json(body, { status, headers });
const invalid = () => reply({ error: "بيانات الطلب غير صحيحة." }, 400);

export async function mobileLoginHandler(request: Request, path: Path, service: Service): Promise<Response> {
  if (request.method !== "POST") return reply({ error: "طريقة الطلب غير مسموحة." }, 405);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return reply({ error: "نوع الطلب غير مسموح." }, 415);
  }
  // Native callers omit Origin. Browser callers must be same-origin; this is not identity authorization.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ error: "الطلب غير مسموح." }, 403);
  if (Number(request.headers.get("content-length")) > 2048) return invalid();
  const reader = request.body?.getReader();
  if (!reader) return invalid();
  let size = 0, text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2048) { await reader.cancel(); return invalid(); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch { return invalid(); }
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return invalid();
    body = parsed as Record<string, unknown>;
  } catch { return invalid(); }
  const allowed = path === "student-login" ? ["nid", "csmart"] : path === "request-code" ? ["nid", "portal"] : ["challenge", "code", "portal"];
  if (Object.keys(body).some(key => !allowed.includes(key))) return invalid();
  let result: Result;
  try {
    if (path === "student-login") {
      if (typeof body.nid !== "string" || !/^[12]\d{9}$/.test(body.nid) || typeof body.csmart !== "string" || !body.csmart.trim() || body.csmart.length > 40) return invalid();
      result = await service.studentSignIn({ nid: body.nid, csmart: body.csmart.trim() });
    } else {
      if (body.portal !== "guardian" && body.portal !== "staff") return invalid();
      if (path === "request-code") {
        if (typeof body.nid !== "string" || !/^[12]\d{9}$/.test(body.nid)) return invalid();
        result = await service.requestIdCode({ nid: body.nid, portal: body.portal });
      } else {
        if (typeof body.challenge !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.challenge) || typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) return invalid();
        result = await service.verifyIdCode({ challenge: body.challenge, code: body.code, portal: body.portal });
      }
    }
  } catch {
    // Do not log identities, tokens, codes, phone numbers, or database errors here.
    return reply({ error: "تعذّر إتمام الدخول. حاول مرة أخرى." }, 500);
  }
  if (result.error) return reply({ error: result.error }, 400);
  // Only return existing public DTO fields, never database rows or phone numbers.
  if (path === "request-code" && result.challenge) return reply({ challenge: result.challenge, masked: result.masked ?? "" }, 200);
  if (path !== "request-code" && result.token) return reply({ token: result.token }, 200);
  return reply({ error: "تعذّر إتمام الدخول. حاول مرة أخرى." }, 500);
}
