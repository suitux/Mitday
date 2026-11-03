CREATE TYPE "public"."date_mode" AS ENUM('range', 'dates', 'open');--> statement-breakpoint
CREATE TYPE "public"."granularity" AS ENUM('day', 'slot', 'hour');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('full', 'aggregate', 'hidden');--> statement-breakpoint
CREATE TABLE "accounts" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "answer_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"label" text NOT NULL,
	"color" text NOT NULL,
	"weight" numeric(3, 2) NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text,
	"locale" text DEFAULT 'es' NOT NULL,
	"edit_token_hash" text,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_dates" (
	"plan_id" uuid NOT NULL,
	"date" date NOT NULL,
	CONSTRAINT "plan_dates_plan_id_date_pk" PRIMARY KEY("plan_id","date")
);
--> statement-breakpoint
CREATE TABLE "plan_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"label" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"granularity" "granularity" NOT NULL,
	"date_mode" date_mode NOT NULL,
	"range_start" date,
	"range_end" date,
	"hour_interval" integer,
	"day_start_minute" integer,
	"day_end_minute" integer,
	"timezone" text NOT NULL,
	"visibility" "visibility" DEFAULT 'full' NOT NULL,
	"notify_on_response" boolean DEFAULT true NOT NULL,
	"status" "plan_status" DEFAULT 'open' NOT NULL,
	"final_cell" text,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"participant_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"cell" text NOT NULL,
	"option_id" uuid NOT NULL,
	CONSTRAINT "responses_participant_id_cell_pk" PRIMARY KEY("participant_id","cell")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"locale" text DEFAULT 'es' NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_dates" ADD CONSTRAINT "plan_dates_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_slots" ADD CONSTRAINT "plan_slots_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_option_id_answer_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."answer_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answer_options_plan_idx" ON "answer_options" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "participants_plan_idx" ON "participants" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_plan_user_uq" ON "participants" USING btree ("plan_id","user_id") WHERE "participants"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "plan_slots_plan_idx" ON "plan_slots" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plans_owner_idx" ON "plans" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "responses_plan_cell_idx" ON "responses" USING btree ("plan_id","cell");