import { z } from "zod";
import { isoDateSchema } from "./cells";
import { diffDays, MAX_RANGE_DAYS } from "./grid";

/** Fixed palette for answer options. Values are used as CSS colors. */
export const OPTION_COLORS = {
  green: "#16a34a",
  lime: "#65a30d",
  amber: "#d97706",
  orange: "#ea580c",
  red: "#dc2626",
  sky: "#0284c7",
  violet: "#7c3aed",
  slate: "#64748b",
} as const;
export type OptionColor = keyof typeof OPTION_COLORS;
export const optionColorSchema = z.enum(
  Object.keys(OPTION_COLORS) as [OptionColor, ...OptionColor[]],
);

export function colorValue(color: string): string {
  return OPTION_COLORS[color as OptionColor] ?? OPTION_COLORS.slate;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const detailsSchema = z.object({
  title: z.string().trim().min(1, "required").max(80, "too_long"),
  description: z.string().trim().max(500, "too_long").optional().default(""),
});

export const optionInputSchema = z.object({
  id: z.uuid().optional(),
  label: z.string().trim().min(1, "required").max(30, "too_long"),
  color: optionColorSchema,
  weight: z.number().min(0).max(1),
});

export const slotInputSchema = z.object({
  id: z.uuid().optional(),
  label: z.string().trim().min(1, "required").max(30, "too_long"),
});

const timeConfig = z.object({
  hourInterval: z.union([z.literal(30), z.literal(60)]),
  dayStartMinute: z.number().int().min(0).max(1410),
  dayEndMinute: z.number().int().min(30).max(1440),
  timezone: z.string().refine(isValidTimeZone, "invalid_timezone"),
});

export const whenSchema = z
  .object({
    dateMode: z.enum(["range", "dates", "open"]),
    rangeStart: isoDateSchema.nullable().optional(),
    rangeEnd: isoDateSchema.nullable().optional(),
    dates: z.array(isoDateSchema).max(100, "too_many_dates").default([]),
    granularity: z.enum(["day", "slot", "hour"]),
    slots: z.array(slotInputSchema).max(6, "too_many_slots").default([]),
  })
  .merge(timeConfig)
  .superRefine((v, ctx) => {
    if (v.dateMode === "range") {
      if (!v.rangeStart || !v.rangeEnd) {
        ctx.addIssue({
          code: "custom",
          path: ["rangeEnd"],
          message: "range_required",
        });
      } else {
        const n = diffDays(v.rangeStart, v.rangeEnd);
        if (n < 0)
          ctx.addIssue({
            code: "custom",
            path: ["rangeEnd"],
            message: "range_order",
          });
        else if (n + 1 > MAX_RANGE_DAYS)
          ctx.addIssue({
            code: "custom",
            path: ["rangeEnd"],
            message: "range_too_long",
          });
      }
    }
    if (v.dateMode === "dates") {
      if (v.dates.length < 1)
        ctx.addIssue({
          code: "custom",
          path: ["dates"],
          message: "dates_required",
        });
      if (new Set(v.dates).size !== v.dates.length)
        ctx.addIssue({
          code: "custom",
          path: ["dates"],
          message: "dates_duplicate",
        });
    }
    if (v.granularity === "slot" && v.slots.length < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["slots"],
        message: "slots_required",
      });
    }
    if (v.granularity === "hour") {
      if (v.dayEndMinute - v.dayStartMinute < v.hourInterval)
        ctx.addIssue({
          code: "custom",
          path: ["dayEndMinute"],
          message: "hours_order",
        });
      if (
        v.dayStartMinute % v.hourInterval !== 0 ||
        v.dayEndMinute % v.hourInterval !== 0
      )
        ctx.addIssue({
          code: "custom",
          path: ["dayStartMinute"],
          message: "hours_alignment",
        });
    }
  });

export const answersSchema = z.object({
  options: z
    .array(optionInputSchema)
    .min(2, "too_few_options")
    .max(5, "too_many_options"),
});

export const privacySchema = z.object({
  visibility: z.enum(["full", "aggregate", "hidden"]),
  notifyOnResponse: z.boolean(),
});

export const createPlanSchema = z.object({
  details: detailsSchema,
  when: whenSchema,
  answers: answersSchema,
  privacy: privacySchema,
});

export type CreatePlanInput = z.input<typeof createPlanSchema>;
export type CreatePlanData = z.output<typeof createPlanSchema>;
export type WhenInput = z.input<typeof whenSchema>;
export type OptionInput = z.infer<typeof optionInputSchema>;

export const participantNameSchema = z.object({
  name: z.string().trim().min(1, "required").max(40, "too_long"),
  email: z
    .union([z.literal(""), z.email("invalid_email").max(200)])
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null)),
});
