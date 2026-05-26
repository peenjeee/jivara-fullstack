ALTER TABLE "food_scans"
  ADD COLUMN IF NOT EXISTS "recommended_foods" jsonb,
  ADD COLUMN IF NOT EXISTS "foods_to_avoid" jsonb,
  ADD COLUMN IF NOT EXISTS "recommendation_summary" jsonb,
  ADD COLUMN IF NOT EXISTS "matched_medication_categories" jsonb,
  ADD COLUMN IF NOT EXISTS "recommendation_patient_medications" jsonb,
  ADD COLUMN IF NOT EXISTS "analyzed_medication_count" integer;
