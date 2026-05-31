ALTER TABLE "food_scans" ADD COLUMN IF NOT EXISTS "nutrition_items" jsonb;
ALTER TABLE "food_scans" ADD COLUMN IF NOT EXISTS "nutrition_total" jsonb;
