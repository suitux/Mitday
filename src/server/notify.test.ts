import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/auth", () => ({}));
const { shouldNotifyCreator } = await import("./notify");

const now = new Date("2026-11-03T12:00:00Z");
const base = {
  notifyOnResponse: true,
  isFirstSave: false,
  notifiedAt: null,
  isOwner: false,
  now,
};

describe("shouldNotifyCreator", () => {
  it("first save notifies", () => {
    expect(
      shouldNotifyCreator({
        ...base,
        isFirstSave: true,
        notifiedAt: new Date(now.getTime() - 1000),
      }),
    ).toBe(true);
  });
  it("edit within 60 min does not notify", () => {
    expect(
      shouldNotifyCreator({
        ...base,
        notifiedAt: new Date(now.getTime() - 59 * 60_000),
      }),
    ).toBe(false);
  });
  it("edit after 60 min notifies", () => {
    expect(
      shouldNotifyCreator({
        ...base,
        notifiedAt: new Date(now.getTime() - 61 * 60_000),
      }),
    ).toBe(true);
  });
  it("respects notifyOnResponse and skips the owner", () => {
    expect(
      shouldNotifyCreator({
        ...base,
        isFirstSave: true,
        notifyOnResponse: false,
      }),
    ).toBe(false);
    expect(
      shouldNotifyCreator({ ...base, isFirstSave: true, isOwner: true }),
    ).toBe(false);
  });
});
