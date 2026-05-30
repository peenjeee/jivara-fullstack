ALTER TABLE "medicine_catalog" ADD COLUMN IF NOT EXISTS "nomor_registrasi" varchar(128);
ALTER TABLE "medicine_catalog" ADD COLUMN IF NOT EXISTS "nama_produk" varchar(256);
ALTER TABLE "medicine_catalog" ADD COLUMN IF NOT EXISTS "komposisi_normalized" text;
ALTER TABLE "medicine_catalog" ADD COLUMN IF NOT EXISTS "list_zat_aktif" text;
ALTER TABLE "medicine_catalog" ADD COLUMN IF NOT EXISTS "all_drug_categories" text;
ALTER TABLE "medicine_catalog" ADD COLUMN IF NOT EXISTS "kelompok_bentuk_sediaan" varchar(128);

UPDATE "medicine_catalog"
SET "nomor_registrasi" = COALESCE("nomor_registrasi", "backend_drug_id"),
    "nama_produk" = COALESCE("nama_produk", "product_name"),
    "all_drug_categories" = COALESCE("all_drug_categories", "drug_category")
WHERE "nomor_registrasi" IS NULL OR "nama_produk" IS NULL OR "all_drug_categories" IS NULL;

ALTER TABLE "medicine_catalog" ALTER COLUMN "nomor_registrasi" SET NOT NULL;
ALTER TABLE "medicine_catalog" ALTER COLUMN "nama_produk" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "medicine_catalog_nomor_registrasi_unique" ON "medicine_catalog" ("nomor_registrasi");
CREATE INDEX IF NOT EXISTS "idx_medicine_catalog_registration_number" ON "medicine_catalog" ("nomor_registrasi");
CREATE INDEX IF NOT EXISTS "idx_medicine_catalog_dosage_form_group" ON "medicine_catalog" ("kelompok_bentuk_sediaan");

ALTER TABLE "medicine_catalog" DROP COLUMN IF EXISTS "backend_drug_id";
ALTER TABLE "medicine_catalog" DROP COLUMN IF EXISTS "product_name";
ALTER TABLE "medicine_catalog" DROP COLUMN IF EXISTS "drug_category";

ALTER TABLE "medication_schedules" ADD COLUMN IF NOT EXISTS "registration_number" varchar(128);
ALTER TABLE "medication_schedules" ADD COLUMN IF NOT EXISTS "composition_normalized" text;
ALTER TABLE "medication_schedules" ADD COLUMN IF NOT EXISTS "active_substances" text;
ALTER TABLE "medication_schedules" ADD COLUMN IF NOT EXISTS "drug_categories" text;
