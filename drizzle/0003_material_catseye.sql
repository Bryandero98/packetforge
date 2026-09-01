CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Seeded before tasks.project_id's FK constraint below is added: every
-- task that existed before this migration gets backfilled to
-- project_id = 'default' by the column's own DEFAULT clause, and that
-- FK can only validate if 'default' already exists as a real row.
INSERT INTO "projects" ("id", "name") VALUES ('default', 'Default Project');--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "project_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;