import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ---------------------------------------------------------------------------
// Auth.js tables (Drizzle adapter shape) + users.locale
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  locale: text("locale").notNull().default("es"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------

export const granularityEnum = pgEnum("granularity", ["day", "slot", "hour"]);
export const dateModeEnum = pgEnum("date_mode", ["range", "dates", "open"]);
export const visibilityEnum = pgEnum("visibility", [
  "full",
  "aggregate",
  "hidden",
]);
export const planStatusEnum = pgEnum("plan_status", ["open", "closed"]);

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    granularity: granularityEnum("granularity").notNull(),
    dateMode: dateModeEnum("date_mode").notNull(),
    rangeStart: date("range_start", { mode: "string" }),
    rangeEnd: date("range_end", { mode: "string" }),
    hourInterval: integer("hour_interval"),
    dayStartMinute: integer("day_start_minute"),
    dayEndMinute: integer("day_end_minute"),
    timezone: text("timezone").notNull(),
    visibility: visibilityEnum("visibility").notNull().default("full"),
    notifyOnResponse: boolean("notify_on_response").notNull().default(true),
    status: planStatusEnum("status").notNull().default("open"),
    finalCell: text("final_cell"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("plans_owner_idx").on(t.ownerId)],
);

export const planDates = pgTable(
  "plan_dates",
  {
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.planId, t.date] })],
);

export const planSlots = pgTable(
  "plan_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    order: integer("order").notNull(),
  },
  (t) => [index("plan_slots_plan_idx").on(t.planId)],
);

export const answerOptions = pgTable(
  "answer_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    color: text("color").notNull(),
    weight: numeric("weight", {
      precision: 3,
      scale: 2,
      mode: "number",
    }).notNull(),
    order: integer("order").notNull(),
  },
  (t) => [index("answer_options_plan_idx").on(t.planId)],
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email"),
    locale: text("locale").notNull().default("es"),
    editTokenHash: text("edit_token_hash"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    /** First time the participant saved answers (personal link is sent once). */
    savedAt: timestamp("saved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("participants_plan_idx").on(t.planId),
    uniqueIndex("participants_plan_user_uq")
      .on(t.planId, t.userId)
      .where(sql`${t.userId} is not null`),
  ],
);

export const responses = pgTable(
  "responses",
  {
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    // Denormalised for the (planId, cell) aggregate index.
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    cell: text("cell").notNull(),
    optionId: uuid("option_id")
      .notNull()
      .references(() => answerOptions.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.participantId, t.cell] }),
    index("responses_plan_cell_idx").on(t.planId, t.cell),
  ],
);

export type User = typeof users.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type PlanSlot = typeof planSlots.$inferSelect;
export type AnswerOption = typeof answerOptions.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type ResponseRow = typeof responses.$inferSelect;
