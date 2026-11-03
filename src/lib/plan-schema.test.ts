import { describe, expect, it } from "vitest";
import {
  createPlanSchema,
  participantNameSchema,
  type CreatePlanInput,
} from "./plan-schema";

const valid: CreatePlanInput = {
  details: { title: "Cena de Navidad", description: "" },
  when: {
    dateMode: "range",
    rangeStart: "2026-12-01",
    rangeEnd: "2026-12-20",
    dates: [],
    granularity: "day",
    slots: [],
    hourInterval: 60,
    dayStartMinute: 540,
    dayEndMinute: 1380,
    timezone: "Europe/Madrid",
  },
  answers: {
    options: [
      { label: "Sí", color: "green", weight: 1 },
      { label: "No", color: "red", weight: 0 },
    ],
  },
  privacy: { visibility: "full", notifyOnResponse: true },
};

const withWhen = (when: Partial<CreatePlanInput["when"]>) => ({
  ...valid,
  when: { ...valid.when, ...when },
});

describe("createPlanSchema", () => {
  it("accepts a valid plan", () => {
    expect(createPlanSchema.safeParse(valid).success).toBe(true);
  });
  it("title limits", () => {
    expect(
      createPlanSchema.safeParse({ ...valid, details: { title: "  " } })
        .success,
    ).toBe(false);
    expect(
      createPlanSchema.safeParse({
        ...valid,
        details: { title: "x".repeat(81) },
      }).success,
    ).toBe(false);
    expect(
      createPlanSchema.safeParse({
        ...valid,
        details: { title: "x", description: "y".repeat(501) },
      }).success,
    ).toBe(false);
  });
  it("range max 366 days and ordered", () => {
    expect(
      createPlanSchema.safeParse(
        withWhen({ rangeStart: "2026-01-01", rangeEnd: "2027-01-01" }),
      ).success,
    ).toBe(true);
    expect(
      createPlanSchema.safeParse(
        withWhen({ rangeStart: "2026-01-01", rangeEnd: "2027-01-02" }),
      ).success,
    ).toBe(false);
    expect(
      createPlanSchema.safeParse(
        withWhen({ rangeStart: "2026-02-01", rangeEnd: "2026-01-01" }),
      ).success,
    ).toBe(false);
  });
  it("dates 1–100, unique", () => {
    expect(
      createPlanSchema.safeParse(withWhen({ dateMode: "dates", dates: [] }))
        .success,
    ).toBe(false);
    expect(
      createPlanSchema.safeParse(
        withWhen({ dateMode: "dates", dates: ["2026-12-01", "2026-12-01"] }),
      ).success,
    ).toBe(false);
    const many = Array.from(
      { length: 101 },
      (_, i) =>
        `2026-0${1 + Math.floor(i / 28)}-${String((i % 28) + 1).padStart(2, "0")}`,
    );
    expect(
      createPlanSchema.safeParse(withWhen({ dateMode: "dates", dates: many }))
        .success,
    ).toBe(false);
  });
  it("slots 1–6", () => {
    expect(
      createPlanSchema.safeParse(withWhen({ granularity: "slot", slots: [] }))
        .success,
    ).toBe(false);
    const seven = Array.from({ length: 7 }, (_, i) => ({ label: `S${i}` }));
    expect(
      createPlanSchema.safeParse(
        withWhen({ granularity: "slot", slots: seven }),
      ).success,
    ).toBe(false);
    expect(
      createPlanSchema.safeParse(
        withWhen({ granularity: "slot", slots: [{ label: "Cena" }] }),
      ).success,
    ).toBe(true);
  });
  it("hour config", () => {
    expect(
      createPlanSchema.safeParse(
        withWhen({
          granularity: "hour",
          dayStartMinute: 600,
          dayEndMinute: 600,
        }),
      ).success,
    ).toBe(false);
    expect(
      createPlanSchema.safeParse(
        withWhen({
          granularity: "hour",
          hourInterval: 60,
          dayStartMinute: 570,
        }),
      ).success,
    ).toBe(false);
    expect(
      createPlanSchema.safeParse(
        withWhen({ granularity: "hour", timezone: "Mars/Olympus" }),
      ).success,
    ).toBe(false);
  });
  it("options 2–5 with weights 0–1", () => {
    const opt = { label: "x", color: "green" as const, weight: 1 };
    expect(
      createPlanSchema.safeParse({ ...valid, answers: { options: [opt] } })
        .success,
    ).toBe(false);
    expect(
      createPlanSchema.safeParse({
        ...valid,
        answers: { options: Array(6).fill(opt) },
      }).success,
    ).toBe(false);
    expect(
      createPlanSchema.safeParse({
        ...valid,
        answers: { options: [opt, { ...opt, weight: 2 }] },
      }).success,
    ).toBe(false);
    expect(
      createPlanSchema.safeParse({
        ...valid,
        answers: { options: [opt, { ...opt, color: "pink" }] },
      }).success,
    ).toBe(false);
  });
});

describe("participantNameSchema", () => {
  it("name 1–40, optional email", () => {
    expect(participantNameSchema.parse({ name: " Ana ", email: "" })).toEqual({
      name: "Ana",
      email: null,
    });
    expect(
      participantNameSchema.parse({ name: "Ana", email: "ANA@x.com" }).email,
    ).toBe("ana@x.com");
    expect(
      participantNameSchema.safeParse({ name: "x".repeat(41) }).success,
    ).toBe(false);
    expect(
      participantNameSchema.safeParse({ name: "Ana", email: "nope" }).success,
    ).toBe(false);
  });
});
