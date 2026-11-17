import { httpsOrigin, publicKey, VPS_API_URL, VPS_PLATFORM_URL, VPS_PUBLIC_KEY } from "../connection";

 describe("VPS connection boundary", () => {
  it("uses the VPS API rather than the cloud database", () => {
    expect(VPS_API_URL).toBe("https://api.kalmalki.com");
  });
  it("keeps the custom login origin separate from the database API", () => {
    expect(VPS_PLATFORM_URL).toBe("https://app.kalmalki.com");
    expect(VPS_PLATFORM_URL).not.toBe(VPS_API_URL);
  });
  it("accepts only the verified public anon JWT", () => {
    expect(publicKey(VPS_PUBLIC_KEY)).toBe(VPS_PUBLIC_KEY);
  });
  it("rejects server credentials", () => {
    expect(() => publicKey("sb_secret_example")).toThrow();
    const payload = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url");
    expect(() => publicKey(`header.${payload}.signature`)).toThrow();
  });
  it("requires HTTPS and refuses embedded credentials and paths", () => {
    expect(httpsOrigin("https://api.kalmalki.com/")).toBe(VPS_API_URL);
    expect(() => httpsOrigin("http://api.kalmalki.com")).toThrow();
    expect(() => httpsOrigin("https://user:password@api.kalmalki.com")).toThrow();
    expect(() => httpsOrigin("https://api.kalmalki.com/auth/v1")).toThrow();
  });
});
