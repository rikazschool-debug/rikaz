import { digitsOnly, displayableEmail, isValidNationalId, isValidOtp, RESEND_SECONDS } from "../identity";

describe("identity rules", () => {
  it("accepts a 10-digit national ID starting with 1 or an iqama starting with 2", () => {
    expect(isValidNationalId("1012345678")).toBe(true);
    expect(isValidNationalId("2012345678")).toBe(true);
  });

  it("rejects IDs that start with another digit or have the wrong length", () => {
    expect(isValidNationalId("3012345678")).toBe(false);
    expect(isValidNationalId("101234567")).toBe(false);
  });

  it("converts Arabic-Indic digits and strips everything else", () => {
    expect(digitsOnly("١٠١٢٣٤٥٦٧٨")).toBe("1012345678");
    expect(digitsOnly("10 12-34 56 78 99")).toBe("1012345678");
  });

  it("requires exactly 6 digits for the code", () => {
    expect(isValidOtp("123456")).toBe(true);
    expect(isValidOtp("12345")).toBe(false);
  });

  it("hides the platform's internal sign-in addresses", () => {
    expect(displayableEmail("1012345678@guardian.rikaz.app")).toBeNull();
    expect(displayableEmail("owner@example.com")).toBe("owner@example.com");
  });

  it("waits one minute before allowing a resend", () => {
    expect(RESEND_SECONDS).toBe(60);
  });
});
