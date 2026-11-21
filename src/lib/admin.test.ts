import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminEmail, parseAdminEmails } from "./admin";

describe("parseAdminEmails", () => {
  it("trims, lower-cases and drops empty entries", () => {
    expect([...parseAdminEmails(" Ana@X.com, ,bob@y.com,, ")]).toEqual([
      "ana@x.com",
      "bob@y.com",
    ]);
  });

  it("returns an empty set for undefined or blank input", () => {
    expect(parseAdminEmails(undefined).size).toBe(0);
    expect(parseAdminEmails("  ").size).toBe(0);
  });
});

describe("isAdminEmail", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("matches case-insensitively", () => {
    vi.stubEnv("ADMIN_EMAILS", "ana@x.com, Bob@Y.com");
    expect(isAdminEmail("ANA@x.com")).toBe(true);
    expect(isAdminEmail("bob@y.com")).toBe(true);
    expect(isAdminEmail("eve@x.com")).toBe(false);
  });

  it("is false for null or missing email", () => {
    vi.stubEnv("ADMIN_EMAILS", "ana@x.com");
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });

  it("is false for everyone when the variable is unset or empty", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isAdminEmail("ana@x.com")).toBe(false);
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail("ana@x.com")).toBe(false);
  });
});
