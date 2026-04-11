CREATE TYPE "guest_session_status" AS ENUM ('active', 'linked', 'expired', 'revoked');

CREATE TABLE "users" (
  "id" text PRIMARY KEY NOT NULL,
  "clerk_user_id" text NOT NULL,
  "primary_email" text,
  "first_name" text,
  "last_name" text,
  "image_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "users_clerk_user_id_unique"
ON "users" ("clerk_user_id");

CREATE TABLE "organizations" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "organizations_slug_unique_idx"
ON "organizations" ("slug");

CREATE TABLE "guest_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "status" "guest_session_status" DEFAULT 'active' NOT NULL,
  "linked_user_id" text,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "guest_sessions"
ADD CONSTRAINT "guest_sessions_linked_user_id_users_id_fk"
FOREIGN KEY ("linked_user_id")
REFERENCES "public"."users"("id")
ON DELETE set null
ON UPDATE no action;

CREATE INDEX "guest_sessions_lifecycle_idx"
ON "guest_sessions" ("status", "expires_at");

CREATE TABLE "guest_user_links" (
  "id" text PRIMARY KEY NOT NULL,
  "guest_session_id" text NOT NULL,
  "user_id" text NOT NULL,
  "linked_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "guest_user_links"
ADD CONSTRAINT "guest_user_links_guest_session_id_guest_sessions_id_fk"
FOREIGN KEY ("guest_session_id")
REFERENCES "public"."guest_sessions"("id")
ON DELETE cascade
ON UPDATE no action;

ALTER TABLE "guest_user_links"
ADD CONSTRAINT "guest_user_links_user_id_users_id_fk"
FOREIGN KEY ("user_id")
REFERENCES "public"."users"("id")
ON DELETE cascade
ON UPDATE no action;

CREATE UNIQUE INDEX "guest_user_links_guest_session_unique_idx"
ON "guest_user_links" ("guest_session_id");

CREATE INDEX "guest_user_links_user_lookup_idx"
ON "guest_user_links" ("user_id");

CREATE TABLE "organization_members" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "user_id" text NOT NULL,
  "role" text DEFAULT 'org:member' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "organization_members"
ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk"
FOREIGN KEY ("organization_id")
REFERENCES "public"."organizations"("id")
ON DELETE cascade
ON UPDATE no action;

ALTER TABLE "organization_members"
ADD CONSTRAINT "organization_members_user_id_users_id_fk"
FOREIGN KEY ("user_id")
REFERENCES "public"."users"("id")
ON DELETE cascade
ON UPDATE no action;

CREATE UNIQUE INDEX "organization_members_org_user_unique_idx"
ON "organization_members" ("organization_id", "user_id");

CREATE INDEX "organization_members_org_lookup_idx"
ON "organization_members" ("organization_id");

CREATE INDEX "organization_members_user_lookup_idx"
ON "organization_members" ("user_id");

CREATE TABLE "clerk_webhook_events" (
  "id" text PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "processed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "priced_quotes"
ADD COLUMN "owner_user_id" text;

ALTER TABLE "priced_quotes"
ADD COLUMN "owner_guest_id" text;

ALTER TABLE "priced_quotes"
ADD COLUMN "owner_org_id" text;

ALTER TABLE "priced_quotes"
ADD CONSTRAINT "priced_quotes_owner_user_id_users_id_fk"
FOREIGN KEY ("owner_user_id")
REFERENCES "public"."users"("id")
ON DELETE set null
ON UPDATE no action;

ALTER TABLE "priced_quotes"
ADD CONSTRAINT "priced_quotes_owner_guest_id_guest_sessions_id_fk"
FOREIGN KEY ("owner_guest_id")
REFERENCES "public"."guest_sessions"("id")
ON DELETE set null
ON UPDATE no action;

ALTER TABLE "priced_quotes"
ADD CONSTRAINT "priced_quotes_owner_org_id_organizations_id_fk"
FOREIGN KEY ("owner_org_id")
REFERENCES "public"."organizations"("id")
ON DELETE set null
ON UPDATE no action;

CREATE INDEX "priced_quotes_owner_lookup_idx"
ON "priced_quotes" ("owner_user_id", "owner_guest_id");
