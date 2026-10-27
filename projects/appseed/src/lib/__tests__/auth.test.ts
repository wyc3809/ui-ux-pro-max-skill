import { isPrivateRelay, isValidEmail, normalizeEmail, resendIn, sanitizeOtp, suggestHandle, validateHandle } from "../auth";

describe("auth rules", () => {
  it("validates and normalises email", () => {
    expect(isValidEmail("  Jamie@Example.com ")).toBe(true);
    expect(normalizeEmail("  Jamie@Example.COM ")).toBe("jamie@example.com");
    expect(isValidEmail("jamie@example")).toBe(false);
    expect(isValidEmail("no at sign")).toBe(false);
  });
  it("keeps only six digits of a pasted code", () => {
    expect(sanitizeOtp("123 456")).toBe("123456");
    expect(sanitizeOtp("Your code: 98-76-54-32")).toBe("987654");
    expect(sanitizeOtp("12a")).toBe("12");
  });
  it("counts down the resend timer", () => {
    expect(resendIn(0, 0)).toBe(30);
    expect(resendIn(0, 29_100)).toBe(1);
    expect(resendIn(0, 31_000)).toBe(0);
  });
  it("validates handles", () => {
    expect(validateHandle("kaylee-builds")).toBeNull();
    expect(validateHandle("ab")).toBe("handleShort");
    expect(validateHandle("a".repeat(21))).toBe("handleLong");
    expect(validateHandle("Kaylee")).toBe("handleChars");
    expect(validateHandle("9lives")).toBe("handleChars");
    expect(validateHandle("admin")).toBe("handleReserved");
  });
  it("suggests a valid handle from a name or email", () => {
    expect(suggestHandle("Kaylee Ho", null)).toBe("kaylee-ho");
    expect(suggestHandle("陳大文", "tai.man99@example.com")).toBe("tai-man99");
    expect(validateHandle(suggestHandle("陳", "42@example.com"))).toBeNull();
    // Apple relay local parts are random: fall back to a stable "maker-xxxx" instead.
    const relay = suggestHandle("", "x7k2pq@privaterelay.appleid.com");
    expect(relay).toMatch(/^maker-[a-z0-9]{4}$/);
    expect(validateHandle(relay)).toBeNull();
    expect(suggestHandle("", "x7k2pq@privaterelay.appleid.com")).toBe(relay);
  });
  it("recognises Apple private relay addresses", () => {
    expect(isPrivateRelay("x7k2@privaterelay.appleid.com")).toBe(true);
    expect(isPrivateRelay("jamie@example.com")).toBe(false);
  });
});
