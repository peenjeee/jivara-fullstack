ALTER TABLE "medication_schedules" ADD COLUMN IF NOT EXISTS "medicine_form" varchar(32) DEFAULT 'Tablet';
ALTER TABLE "medication_schedules" ADD COLUMN IF NOT EXISTS "meal_rule" varchar(64) DEFAULT 'Tidak tergantung makan';

UPDATE "medication_schedules"
SET "medicine_form" = COALESCE(NULLIF("medicine_form", ''), 'Tablet')
WHERE "medicine_form" IS NULL OR "medicine_form" = '';

UPDATE "medication_schedules"
SET "meal_rule" = COALESCE(NULLIF("meal_rule", ''), 'Tidak tergantung makan')
WHERE "meal_rule" IS NULL OR "meal_rule" = '';
