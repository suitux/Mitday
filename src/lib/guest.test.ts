import { describe, expect, it } from "vitest";
import {
  formatGuestCredential,
  generateGuestToken,
  guestCookieName,
  hashGuestToken,
  parseGuestCredential,
  verifyGuestToken,
} from "./guest";

const PID = "3f2b8c1e-5d4a-4b6c-9e8f-1a2b3c4d5e6f";

describe("guest identity", () => {
  it("generates 32-byte base64url tokens and stores only the hash", () => {
    const { token, hash } = generateGuestToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toBe(hashGuestToken(token));
    expect(hash).not.toContain(token);
  });

  it("verifies tokens", () => {
    const { token, hash } = generateGuestToken();
    expect(verifyGuestToken(token, hash)).toBe(true);
    expect(verifyGuestToken(generateGuestToken().token, hash)).toBe(false);
    expect(verifyGuestToken(token, null)).toBe(false);
    expect(verifyGuestToken(token, "abcd")).toBe(false);
  });

  it("formats and parses credentials", () => {
    const { token } = generateGuestToken();
    const v = formatGuestCredential(PID, token);
    expect(parseGuestCredential(v)).toEqual({ participantId: PID, token });
    expect(parseGuestCredential(`${PID}.short`)).toBeNull();
    expect(parseGuestCredential(`not-a-uuid.${token}`)).toBeNull();
    expect(parseGuestCredential(undefined)).toBeNull();
  });

  it("cookie name is per plan", () => {
    expect(guestCookieName("abc")).toBe("quadra_p_abc");
  });
});
