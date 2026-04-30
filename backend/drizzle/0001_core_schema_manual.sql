ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT true;

CREATE TABLE IF NOT EXISTS "patients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "date_of_birth" date,
  "gender" varchar(10),
  "address" text,
  "diagnosis" text,
  "emergency_contact" jsonb,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "nurses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "employee_id" varchar(64),
  "department" varchar(128),
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "patient_nurse_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL REFERENCES "public"."patients"("id") ON DELETE cascade,
  "nurse_id" uuid NOT NULL REFERENCES "public"."nurses"("id") ON DELETE cascade,
  "assigned_at" timestamp DEFAULT now(),
  "assigned_by" uuid REFERENCES "public"."users"("id"),
  "is_active" boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS "prescriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL REFERENCES "public"."patients"("id") ON DELETE cascade,
  "diagnosis" text,
  "prescribing_doctor" varchar(256),
  "start_date" date,
  "end_date" date,
  "created_at" timestamp DEFAULT now(),
  "created_by" uuid REFERENCES "public"."users"("id")
);

CREATE TABLE IF NOT EXISTS "medication_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL REFERENCES "public"."patients"("id") ON DELETE cascade,
  "prescription_id" uuid REFERENCES "public"."prescriptions"("id") ON DELETE set null,
  "drug_name" varchar(256) NOT NULL,
  "dosage" varchar(64) NOT NULL,
  "frequency" integer NOT NULL,
  "scheduled_times" jsonb NOT NULL,
  "instructions" text,
  "is_active" boolean DEFAULT true,
  "created_by" uuid REFERENCES "public"."users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "medication_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "schedule_id" uuid NOT NULL REFERENCES "public"."medication_schedules"("id") ON DELETE cascade,
  "patient_id" uuid NOT NULL REFERENCES "public"."patients"("id") ON DELETE cascade,
  "scheduled_time" timestamp NOT NULL,
  "status" varchar(20) NOT NULL,
  "confirmed_at" timestamp,
  "snooze_count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "food_scans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL REFERENCES "public"."patients"("id") ON DELETE cascade,
  "image_url" text NOT NULL,
  "image_size_kb" integer,
  "inference_time_ms" real,
  "model_version" varchar(64),
  "overall_risk_score" real,
  "overall_risk_level" varchar(20),
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "detected_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scan_id" uuid NOT NULL REFERENCES "public"."food_scans"("id") ON DELETE cascade,
  "label" varchar(128) NOT NULL,
  "label_display" varchar(256) NOT NULL,
  "confidence" real NOT NULL,
  "bounding_box" jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "interaction_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scan_id" uuid NOT NULL REFERENCES "public"."food_scans"("id") ON DELETE cascade,
  "food_item" varchar(128) NOT NULL,
  "medication" varchar(256) NOT NULL,
  "severity" varchar(20) NOT NULL,
  "interaction_description" text,
  "recommendation" text,
  "sources" jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL REFERENCES "public"."patients"("id") ON DELETE cascade,
  "type" varchar(64) NOT NULL,
  "title" varchar(256) NOT NULL,
  "body" text NOT NULL,
  "data" jsonb,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "urgency" varchar(20) DEFAULT 'normal' NOT NULL,
  "scheduled_at" timestamp,
  "delivered_at" timestamp,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid REFERENCES "public"."users"("id"),
  "action" varchar(64) NOT NULL,
  "resource_type" varchar(64) NOT NULL,
  "resource_id" uuid,
  "changes" jsonb,
  "ip_address" varchar(64),
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" USING btree ("role");
CREATE INDEX IF NOT EXISTS "idx_users_phone" ON "users" USING btree ("phone");
CREATE INDEX IF NOT EXISTS "idx_patients_user" ON "patients" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_nurses_user" ON "nurses" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_assignments_patient" ON "patient_nurse_assignments" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_assignments_nurse" ON "patient_nurse_assignments" USING btree ("nurse_id");
CREATE INDEX IF NOT EXISTS "idx_prescriptions_patient" ON "prescriptions" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_med_sched_patient" ON "medication_schedules" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_med_sched_active" ON "medication_schedules" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "idx_med_logs_patient" ON "medication_logs" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_med_logs_status" ON "medication_logs" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_med_logs_date" ON "medication_logs" USING btree ("scheduled_time");
CREATE INDEX IF NOT EXISTS "idx_food_scans_patient" ON "food_scans" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_food_scans_date" ON "food_scans" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "idx_detected_items_scan" ON "detected_items" USING btree ("scan_id");
CREATE INDEX IF NOT EXISTS "idx_interaction_results_scan" ON "interaction_results" USING btree ("scan_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_patient" ON "notifications" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_status" ON "notifications" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_audit_user" ON "audit_logs" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_resource" ON "audit_logs" USING btree ("resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "idx_audit_date" ON "audit_logs" USING btree ("created_at");
