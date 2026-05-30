ALTER TABLE "medication_schedules" ADD COLUMN IF NOT EXISTS "start_date" date;
ALTER TABLE "medication_schedules" ADD COLUMN IF NOT EXISTS "end_date" date;

UPDATE "medication_schedules"
SET "start_date" = COALESCE("start_date", DATE("created_at"))
WHERE "start_date" IS NULL;

UPDATE "medication_schedules"
SET "end_date" = COALESCE("end_date", DATE("completed_at"))
WHERE "end_date" IS NULL AND "completed_at" IS NOT NULL;
