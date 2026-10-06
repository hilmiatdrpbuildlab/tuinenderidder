CREATE TABLE "availability_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"weekday" integer NOT NULL,
	"slot_kind" text NOT NULL,
	"start" text NOT NULL,
	"end" text NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blackout_dates" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	CONSTRAINT "blackout_dates_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "booking_attachments" (
	"booking_id" integer NOT NULL,
	"media_id" integer NOT NULL,
	CONSTRAINT "booking_attachments_booking_id_media_id_pk" PRIMARY KEY("booking_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "booking_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"from_status" text,
	"to_status" text,
	"actor_id" integer,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_services" (
	"booking_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	CONSTRAINT "booking_services_booking_id_service_id_pk" PRIMARY KEY("booking_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"customer_id" integer NOT NULL,
	"type" text NOT NULL,
	"frequency" text DEFAULT 'once' NOT NULL,
	"garden_size" text,
	"slot_id" integer,
	"status" text DEFAULT 'new' NOT NULL,
	"assigned_to" integer,
	"notes_customer" text DEFAULT '' NOT NULL,
	"notes_internal" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'website' NOT NULL,
	"locale" text DEFAULT 'nl' NOT NULL,
	"reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"message" text NOT NULL,
	"locale" text DEFAULT 'nl' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counters" (
	"key" text PRIMARY KEY NOT NULL,
	"value" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"street" text DEFAULT '' NOT NULL,
	"postcode" text DEFAULT '' NOT NULL,
	"municipality" text DEFAULT '' NOT NULL,
	"locale" text DEFAULT 'nl' NOT NULL,
	"consent_at" timestamp with time zone,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"html" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"booking_id" integer,
	"locale" text DEFAULT 'nl' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text DEFAULT '' NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer DEFAULT 0 NOT NULL,
	"width" integer DEFAULT 0 NOT NULL,
	"height" integer DEFAULT 0 NOT NULL,
	"lqip" text,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"focal_x" real DEFAULT 0.5 NOT NULL,
	"focal_y" real DEFAULT 0.5 NOT NULL,
	"alt_nl" text DEFAULT '' NOT NULL,
	"alt_en" text DEFAULT '' NOT NULL,
	"folder" text DEFAULT 'library' NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "page_translations" (
	"page_id" integer NOT NULL,
	"locale" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"blocks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"seo_title" text DEFAULT '' NOT NULL,
	"seo_desc" text DEFAULT '' NOT NULL,
	CONSTRAINT "page_translations_page_id_locale_pk" PRIMARY KEY("page_id","locale")
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "project_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"media_id" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"kind" text DEFAULT 'gallery' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_translations" (
	"project_id" integer NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"story" text DEFAULT '' NOT NULL,
	CONSTRAINT "project_translations_project_id_locale_pk" PRIMARY KEY("project_id","locale")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"service_id" integer,
	"town" text DEFAULT '' NOT NULL,
	"year" integer NOT NULL,
	"cover_media_id" integer,
	"is_featured" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "service_translations" (
	"service_id" integer NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" text DEFAULT '' NOT NULL,
	"seo_desc" text DEFAULT '' NOT NULL,
	CONSTRAINT "service_translations_service_id_locale_pk" PRIMARY KEY("service_id","locale")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"icon" text DEFAULT 'leaf' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_bookable" boolean DEFAULT true NOT NULL,
	"base_duration_min" integer DEFAULT 240 NOT NULL,
	"price_from" integer,
	"price_mode" text DEFAULT 'quote' NOT NULL,
	"cover_media_id" integer,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slot_holds" (
	"id" serial PRIMARY KEY NOT NULL,
	"slot_id" integer NOT NULL,
	"draft_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"slot_kind" text NOT NULL,
	"start" text NOT NULL,
	"end" text NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"booked_count" integer DEFAULT 0 NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_name" text NOT NULL,
	"town" text DEFAULT '' NOT NULL,
	"service_id" integer,
	"rating" integer DEFAULT 5 NOT NULL,
	"quote_nl" text NOT NULL,
	"quote_en" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'google' NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"review_date" date NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"locale" text DEFAULT 'nl' NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "booking_attachments" ADD CONSTRAINT "booking_attachments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_attachments" ADD CONSTRAINT "booking_attachments_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_translations" ADD CONSTRAINT "page_translations_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_translations" ADD CONSTRAINT "project_translations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_translations" ADD CONSTRAINT "service_translations_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_holds" ADD CONSTRAINT "slot_holds_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_events_booking_idx" ON "booking_events" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_slot_idx" ON "bookings" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "bookings_created_idx" ON "bookings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "emails_created_idx" ON "emails" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_media_project_idx" ON "project_media" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "slot_holds_slot_idx" ON "slot_holds" USING btree ("slot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slot_holds_draft_uq" ON "slot_holds" USING btree ("draft_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slots_date_kind_start_uq" ON "slots" USING btree ("date","slot_kind","start");--> statement-breakpoint
CREATE INDEX "slots_date_idx" ON "slots" USING btree ("date");