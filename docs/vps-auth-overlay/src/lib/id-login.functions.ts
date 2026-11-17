// Review overlay: keep the web RPC API but share the exact same server-only service with mobile HTTP.
import { createServerFn } from "@tanstack/react-start";

export const requestIdCode = createServerFn({ method: "POST" })
  .inputValidator((d: { nid: string; portal?: string }) => ({ nid: String(d?.nid ?? "").replace(/\D/g, "").slice(0, 12), portal: d?.portal === "guardian" ? "guardian" as const : "staff" as const }))
  .handler(async ({ data }) => {
    const service = await import("./mobile-id-login.server");
    return service.requestIdCode(data);
  });

export const verifyIdCode = createServerFn({ method: "POST" })
  .inputValidator((d: { challenge: string; code: string; portal?: string }) => ({ challenge: String(d?.challenge ?? ""), code: String(d?.code ?? "").replace(/\D/g, "").slice(0, 6), portal: d?.portal === "guardian" ? "guardian" as const : "staff" as const }))
  .handler(async ({ data }) => {
    const service = await import("./mobile-id-login.server");
    return service.verifyIdCode(data);
  });

export const studentSignIn = createServerFn({ method: "POST" })
  .inputValidator((d: { nid: string; csmart: string }) => ({ nid: String(d?.nid ?? "").replace(/\D/g, "").slice(0, 12), csmart: String(d?.csmart ?? "").trim().slice(0, 40) }))
  .handler(async ({ data }) => {
    const service = await import("./mobile-id-login.server");
    return service.studentSignIn(data);
  });
