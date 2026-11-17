export const VPS_API_URL = "https://api.kalmalki.com";
export const VPS_PLATFORM_URL = "https://app.kalmalki.com";
export const VPS_PUBLIC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0NDIzNDY2LCJleHAiOjE5NTIxMDM0NjZ9.nO1XUcCt8gLM1WPBscRJXeVsVKh-7GR1ImbOZwMDm40";

export function httpsOrigin(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || !/^\/?$/.test(parsed.pathname)) {
    throw new Error("Expected an HTTPS origin without credentials or a path");
  }
  return parsed.origin;
}

export function publicKey(value: string): string {
  if (!value || value.startsWith("sb_secret_")) throw new Error("A public VPS key is required");
  if (value.startsWith("sb_publishable_")) return value;
  // JWT anon keys use a public, visible role claim. Reject service_role before any request.
  const payload = value.split(".")[1];
  if (!payload) throw new Error("Invalid public key");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let bits = 0, count = 0, decoded = "";
  for (const char of payload.replace(/-/g, "+").replace(/_/g, "/")) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error("Invalid public key");
    bits = (bits << 6) | digit; count += 6;
    if (count >= 8) { count -= 8; decoded += String.fromCharCode((bits >> count) & 255); }
  }
  if (JSON.parse(decoded).role !== "anon") throw new Error("Only the anon public key may be used in the mobile app");
  return value;
}
