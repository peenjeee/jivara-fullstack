import dotenv from "dotenv";
dotenv.config();

import fs from "node:fs";
import path from "node:path";
import { db } from "../db";
import { medicineCatalog } from "../db/schema";

const MEDICINE_CATALOG_CSV_PATH = path.resolve(process.cwd(), "../docs/obat_backend_perawat_one_composition_mapped.csv");

type MedicineCatalogSeedRow = {
  registrationNumber: string;
  productName: string;
  compositionNormalized: string | null;
  activeSubstances: string | null;
  drugCategories: string | null;
  dosageFormGroup: string | null;
};

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
};

const clean = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const requireHeader = (headers: readonly string[], header: string) => {
  const index = headers.indexOf(header);
  if (index === -1) throw new Error(`CSV wajib punya kolom ${header}`);
  return index;
};

const loadMedicineCatalogFromCsv = (): MedicineCatalogSeedRow[] => {
  const csv = fs.readFileSync(MEDICINE_CATALOG_CSV_PATH, "utf8").replace(/^\uFEFF/, "");
  const [headerLine, ...dataLines] = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headers = parseCsvLine(headerLine);
  const registrationNumberIndex = requireHeader(headers, "nomor_registrasi");
  const productNameIndex = requireHeader(headers, "nama_produk");
  const compositionNormalizedIndex = requireHeader(headers, "komposisi_normalized");
  const activeSubstancesIndex = requireHeader(headers, "list_zat_aktif");
  const drugCategoriesIndex = requireHeader(headers, "all_drug_categories");
  const dosageFormGroupIndex = requireHeader(headers, "kelompok_bentuk_sediaan");

  const byRegistrationNumber = new Map<string, MedicineCatalogSeedRow>();

  dataLines.forEach((line) => {
    const values = parseCsvLine(line);
    const registrationNumber = clean(values[registrationNumberIndex]);
    const productName = clean(values[productNameIndex]);

    if (!registrationNumber || !productName) return;
    byRegistrationNumber.set(registrationNumber, {
      registrationNumber,
      productName,
      compositionNormalized: clean(values[compositionNormalizedIndex]),
      activeSubstances: clean(values[activeSubstancesIndex]),
      drugCategories: clean(values[drugCategoriesIndex]),
      dosageFormGroup: clean(values[dosageFormGroupIndex]),
    });
  });

  return Array.from(byRegistrationNumber.values());
};

const main = async () => {
  if (!fs.existsSync(MEDICINE_CATALOG_CSV_PATH)) {
    throw new Error(`CSV tidak ditemukan: ${MEDICINE_CATALOG_CSV_PATH}`);
  }

  const rows = loadMedicineCatalogFromCsv();
  await db.delete(medicineCatalog);

  if (rows.length > 0) {
    await db.insert(medicineCatalog).values(rows);
  }

  // console.log(`Medicine catalog imported: ${rows.length} rows`);
};

main()
  .then(() => process.exit(0))
  .catch(() => {
    process.exit(1);
  });
