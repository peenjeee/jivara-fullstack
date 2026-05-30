import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { faker } from "@faker-js/faker";
import { db } from "../db";
import {
  organizations,
  users,
  patients,
  nurses,
  patientNurseAssignments,
  medicationSchedules,
  medicineCatalog,
  medicationLogs,
  foodScans,
  detectedItems,
  interactionResults,
  notifications,
  medicationReminderJobs,
  auditLogs,
} from "../db/schema";
import { AUTH_CONSTANTS } from "../types/auth.types";

const DEMO_PASSWORD = "Demo12345";
const NUM_ORGS = 3;
const NUM_NURSES = 15;
const NUM_PATIENTS = 30;
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

const cleanCsvValue = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const loadMedicineCatalogFromCsv = (): MedicineCatalogSeedRow[] => {
  if (!fs.existsSync(MEDICINE_CATALOG_CSV_PATH)) return [];

  const csv = fs.readFileSync(MEDICINE_CATALOG_CSV_PATH, "utf8").replace(/^\uFEFF/, "");
  const [headerLine, ...dataLines] = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headers = parseCsvLine(headerLine);
  const registrationNumberIndex = headers.indexOf("nomor_registrasi");
  const productNameIndex = headers.indexOf("nama_produk");
  const compositionNormalizedIndex = headers.indexOf("komposisi_normalized");
  const activeSubstancesIndex = headers.indexOf("list_zat_aktif");
  const drugCategoriesIndex = headers.indexOf("all_drug_categories");
  const dosageFormGroupIndex = headers.indexOf("kelompok_bentuk_sediaan");

  if ([registrationNumberIndex, productNameIndex, compositionNormalizedIndex, activeSubstancesIndex, drugCategoriesIndex, dosageFormGroupIndex].some((index) => index === -1)) return [];

  const byRegistrationNumber = new Map<string, MedicineCatalogSeedRow>();

  dataLines.forEach((line) => {
    const values = parseCsvLine(line);
    const registrationNumber = cleanCsvValue(values[registrationNumberIndex]);
    const productName = cleanCsvValue(values[productNameIndex]);

    if (!registrationNumber || !productName) return;
    byRegistrationNumber.set(registrationNumber, {
      registrationNumber,
      productName,
      compositionNormalized: cleanCsvValue(values[compositionNormalizedIndex]),
      activeSubstances: cleanCsvValue(values[activeSubstancesIndex]),
      drugCategories: cleanCsvValue(values[drugCategoriesIndex]),
      dosageFormGroup: cleanCsvValue(values[dosageFormGroupIndex]),
    });
  });

  return Array.from(byRegistrationNumber.values());
};

const clearDatabase = async () => {
  // console.log("Clearing database...");
  await db.delete(auditLogs);
  await db.delete(medicationReminderJobs);
  await db.delete(notifications);
  await db.delete(interactionResults);
  await db.delete(detectedItems);
  await db.delete(foodScans);
  await db.delete(medicationLogs);
  await db.delete(medicationSchedules);
  await db.delete(patientNurseAssignments);
  await db.delete(nurses);
  await db.delete(patients);
  await db.delete(users);
  await db.delete(organizations);
  await db.delete(medicineCatalog);
};

const main = async () => {
  // console.log("Starting seeder with diverse Faker data...");
  await clearDatabase();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

  const medicineCatalogRows = loadMedicineCatalogFromCsv();
  if (medicineCatalogRows.length > 0) {
    await db.insert(medicineCatalog).values(medicineCatalogRows);
  }
  const seedDrugNames = medicineCatalogRows.length > 0
    ? medicineCatalogRows.map((row) => row.productName)
    : ["Amlodipine", "Metformin", "Lisinopril", "Omeprazole", "Salbutamol", "Atorvastatin", "Ibuprofen"];

  // 1. Organizations
  // console.log("Seeding Organizations...");
  const orgs = await db.insert(organizations).values(
    Array.from({ length: NUM_ORGS }).map(() => ({
      name: `RS ${faker.company.name()}`,
    }))
  ).returning();

  // 2. Users - Super Admin
  const [superAdmin] = await db.insert(users).values({
    fullName: "Super Admin Jivara",
    email: "superadmin@jivara.test",
    phone: '+628' + faker.string.numeric(10),
    password: passwordHash,
    role: "superadmin",
    accountStatus: "active",
    gender: "male",
    address: faker.location.streetAddress(),
  }).returning();

  // 3. Admins with varied account statuses
  // console.log("Seeding Admins with various statuses...");
  const adminVariations = [
    { name: "Admin Active", email: "admin@jivara.test", status: "active", approvedBy: superAdmin.id, approvedAt: new Date() },
    { name: "Admin Pending", email: "admin.pending@jivara.test", status: "pending", approvedBy: null, approvedAt: null },
    { name: "Admin Suspended", email: "admin.suspended@jivara.test", status: "suspended", approvedBy: superAdmin.id, approvedAt: new Date() },
    { name: "Admin Rejected", email: "admin.rejected@jivara.test", status: "rejected", approvedBy: superAdmin.id, approvedAt: null, rejectedAt: new Date(), rejectedReason: "Dokumen tidak valid" },
  ];

  const adminUsers = await db.insert(users).values(
    adminVariations.map((v) => ({
      organizationId: orgs[0].id,
      fullName: v.name,
      email: v.email,
      phone: '+628' + faker.string.numeric(10),
      password: passwordHash,
      role: "admin",
      accountStatus: v.status,
      approvedBy: v.approvedBy,
      approvedAt: v.approvedAt,
      rejectedAt: v.rejectedAt || null,
      rejectedReason: v.rejectedReason || null,
      gender: faker.helpers.arrayElement(["male", "female"]),
      address: faker.location.streetAddress(),
    }))
  ).returning();

  // 4. Nurses with varied statuses
  // console.log("Seeding Nurses...");
  const nurseUsers = await db.insert(users).values(
    Array.from({ length: NUM_NURSES }).map((_, i) => {
      // 80% active, 10% suspended, 10% pending
      const status = faker.helpers.weightedArrayElement([
        { weight: 7, value: "active" },
        { weight: 1, value: "suspended" },
        { weight: 1, value: "pending" },
        { weight: 1, value: "rejected" },
      ]);
      return {
        organizationId: orgs[i % NUM_ORGS].id,
        fullName: `Ns. ${faker.person.fullName()}`,
        email: i === 0 ? "nurse1@jivara.test" : `nurse.${faker.string.alphanumeric(5)}@jivara.test`,
        phone: '+628' + faker.string.numeric(10),
        password: passwordHash,
        role: "nurse",
        accountStatus: status,
        approvedBy: status === "active" || status === "suspended" ? adminUsers[0].id : null,
        approvedAt: status === "active" || status === "suspended" ? new Date() : null,
        rejectedAt: status === "rejected" ? new Date() : null,
        rejectedReason: status === "rejected" ? "Sertifikasi tidak valid" : null,
        isActive: status === "active",
        gender: faker.helpers.arrayElement(["male", "female"]),
        address: faker.location.streetAddress(),
        age: faker.number.int({ min: 22, max: 55 }),
        mustChangePassword: faker.helpers.weightedArrayElement([{ weight: 9, value: false }, { weight: 1, value: true }]),
      };
    })
  ).returning();

  const nursesData = await db.insert(nurses).values(
    nurseUsers.map((u) => ({
      userId: u.id,
      organizationId: u.organizationId,
      employeeId: `NUR-${faker.string.numeric(6)}`,
      department: faker.helpers.arrayElement(["IGD", "ICU", "Rawat Inap", "Poliklinik", "Bedah"]),
      isActive: u.isActive,
    }))
  ).returning();

  // 5. Patients with varied profiles
  // console.log("Seeding Patients...");
  const patientUsers = await db.insert(users).values(
    Array.from({ length: NUM_PATIENTS }).map((_, i) => {
      // 90% active, 10% suspended
      const status = faker.helpers.weightedArrayElement([
        { weight: 7, value: "active" },
        { weight: 1, value: "suspended" },
        { weight: 1, value: "pending" },
        { weight: 1, value: "rejected" },
      ]);
      return {
        organizationId: orgs[i % NUM_ORGS].id,
        fullName: faker.person.fullName(),
        email: i === 0 ? "patient1@jivara.test" : `patient.${faker.string.alphanumeric(5)}@jivara.test`,
        phone: '+628' + faker.string.numeric(10),
        password: passwordHash,
        role: "patient",
        accountStatus: status,
        approvedBy: status === "active" || status === "suspended" ? adminUsers[0].id : null,
        approvedAt: status === "active" || status === "suspended" ? new Date() : null,
        rejectedAt: status === "rejected" ? new Date() : null,
        rejectedReason: status === "rejected" ? "Data identitas tidak lengkap" : null,
        isActive: status === "active",
        gender: faker.helpers.arrayElement(["male", "female"]),
        address: faker.location.streetAddress(),
        age: faker.number.int({ min: 18, max: 85 }),
        mustChangePassword: faker.helpers.weightedArrayElement([{ weight: 9, value: false }, { weight: 1, value: true }]),
      };
    })
  ).returning();

  const patientsData = await db.insert(patients).values(
    patientUsers.map((u) => ({
      userId: u.id,
      organizationId: u.organizationId,
      dateOfBirth: faker.date.birthdate({ mode: 'age', min: u.age, max: u.age }).toISOString().split('T')[0],
      gender: u.gender,
      address: u.address,
      diagnosis: faker.helpers.arrayElement(["Hipertensi", "Diabetes Mellitus Tipe 2", "Gagal Jantung Kongestif", "Asma Kronis", "Penyakit Ginjal Kronis", "TBC", "Pneumonia"]),
      emergencyContact: {
        name: faker.person.fullName(),
        phone: '+628' + faker.string.numeric(10),
        relationship: faker.helpers.arrayElement(["Suami", "Istri", "Anak", "Saudara kandung"]),
      },
      isActive: u.isActive,
    }))
  ).returning();

  // 6. Patient-Nurse Assignments
  // console.log("Seeding Assignments...");
  // Hanya tugaskan ke perawat dan pasien yang aktif
  const activeNurses = nursesData.filter(n => n.isActive);
  const activePatients = patientsData.filter(p => p.isActive);

  for (const patient of activePatients) {
    // Tiap pasien dihandle 1-2 perawat
    const numNurses = faker.number.int({ min: 1, max: 2 });
    const assignedNurses = faker.helpers.arrayElements(activeNurses, numNurses);

    for (const nurse of assignedNurses) {
      await db.insert(patientNurseAssignments).values({
        patientId: patient.id,
        nurseId: nurse.id,
        assignedBy: adminUsers[0].id, // Assigned by active admin
        isActive: true,
      });
    }
  }

  // 7. Schedules & Logs
  // console.log("Seeding Medical Records (Schedules, Logs)...");
  for (const patient of activePatients) {
    // 1-6 jadwal per pasien
    const numSchedules = faker.number.int({ min: 1, max: 6 });
    for (let j = 0; j < numSchedules; j++) {
      const drug = faker.helpers.arrayElement(seedDrugNames);
      const freqs = [
        { freq: 1, times: ["08:00"] },
        { freq: 2, times: ["08:00", "20:00"] },
        { freq: 3, times: ["08:00", "14:00", "20:00"] }
      ];
      const selectedFreq = faker.helpers.arrayElement(freqs);

      const [schedule] = await db.insert(medicationSchedules).values({
        patientId: patient.id,
        drugName: drug,
        dosage: faker.helpers.arrayElement(["5mg", "10mg", "20mg", "50mg", "500mg"]),
        frequency: selectedFreq.freq,
        scheduledTimes: selectedFreq.times,
        instructions: faker.helpers.arrayElement(["Sesudah makan", "Sebelum makan", "Bersama makanan", "Sebelum tidur"]),
        createdBy: adminUsers[0].id,
        isActive: faker.helpers.weightedArrayElement([{ weight: 8, value: true }, { weight: 2, value: false }]),
      }).returning();

      // Generate Logs untuk 3 hari terakhir dan hari ini
      const logsData = [];
      for (let dayOffset = -3; dayOffset <= 0; dayOffset++) {
        for (const timeStr of selectedFreq.times) {
          const [hour, minute] = timeStr.split(':').map(Number);
          const scheduledDate = new Date();
          scheduledDate.setDate(scheduledDate.getDate() + dayOffset);
          scheduledDate.setHours(hour, minute, 0, 0);

          let status = "pending";
          let confirmedAt = null;
          let snoozeCount = 0;

          if (dayOffset < 0 || (dayOffset === 0 && scheduledDate < new Date())) {
            // Past times
            status = faker.helpers.weightedArrayElement([
              { weight: 70, value: "confirmed" },
              { weight: 15, value: "missed" },
              { weight: 15, value: "snoozed" }
            ]);

            if (status === "confirmed") {
              // Konfirmasi bisa tepat waktu atau telat sedikit
              confirmedAt = new Date(scheduledDate.getTime() + faker.number.int({ min: -5, max: 60 }) * 60000);
            } else if (status === "snoozed") {
              snoozeCount = faker.number.int({ min: 1, max: 3 });
            }
          }

          logsData.push({
            scheduleId: schedule.id,
            patientId: patient.id,
            scheduledTime: scheduledDate,
            status,
            confirmedAt,
            snoozeCount,
          });
        }
      }
      await db.insert(medicationLogs).values(logsData);
    }
  }

  // 8. Food Scans & Interactions (Varied severity)
  // console.log("Seeding Food Scans & Drug Interactions...");
  for (let i = 0; i < 20; i++) {
    const patient = faker.helpers.arrayElement(activePatients);
    const riskLevel = faker.helpers.weightedArrayElement([
      { weight: 5, value: "low" },
      { weight: 3, value: "medium" },
      { weight: 2, value: "high" }
    ]);
    const score = riskLevel === "low" ? faker.number.float({ min: 0.1, max: 0.3 }) :
      riskLevel === "medium" ? faker.number.float({ min: 0.4, max: 0.6 }) :
        faker.number.float({ min: 0.7, max: 0.99 });

    const [scan] = await db.insert(foodScans).values({
      patientId: patient.id,
      imageUrl: faker.image.urlLoremFlickr({ category: 'food' }),
      imageSizeKb: faker.number.int({ min: 500, max: 3000 }),
      inferenceTimeMs: faker.number.int({ min: 100, max: 1500 }),
      modelVersion: "v1.2",
      overallRiskScore: score,
      overallRiskLevel: riskLevel,
    }).returning();

    const foodName = faker.helpers.arrayElement(["Apel", "Sate Kambing", "Sayur Bayam", "Jeruk Bali (Grapefruit)", "Gorengan", "Kopi Hitam"]);
    await db.insert(detectedItems).values({
      scanId: scan.id,
      label: foodName.toLowerCase(),
      labelDisplay: foodName,
      confidence: faker.number.float({ min: 0.7, max: 0.99 }),
    });

    if (riskLevel !== "low") {
      await db.insert(interactionResults).values({
        scanId: scan.id,
        foodItem: foodName,
        medication: faker.helpers.arrayElement(["Amlodipine", "Metformin", "Atorvastatin"]),
        severity: riskLevel,
        interactionDescription: `Konsumsi ${foodName} dapat mempengaruhi efektivitas obat.`,
        recommendation: riskLevel === "high" ? "Sangat disarankan untuk dihindari." : "Batasi konsumsi secukupnya.",
      });
    }
  }

  // 9. Notifications (Varied statuses: pending, read, delivered / urgency: low, normal, high)
  // console.log("Seeding Notifications...");
  const notificationsData = [];
  for (let i = 0; i < 50; i++) {
    const patient = faker.helpers.arrayElement(activePatients);
    const notifStatus = faker.helpers.arrayElement(["pending", "delivered", "read"]);

    notificationsData.push({
      patientId: patient.id,
      type: faker.helpers.arrayElement(["medication_reminder", "appointment", "system_alert", "food_warning"]),
      title: faker.lorem.words({ min: 2, max: 5 }),
      body: faker.lorem.sentence(),
      status: notifStatus,
      urgency: faker.helpers.arrayElement(["low", "normal", "high"]),
      scheduledAt: faker.date.recent(),
      deliveredAt: notifStatus !== "pending" ? new Date() : null,
      readAt: notifStatus === "read" ? new Date() : null,
    });
  }
  await db.insert(notifications).values(notificationsData);

  // console.log(JSON.stringify({
  //   status: "berhasil",
  //   message: "Data dummy SUPER LENGKAP dengan berbagai variasi status berhasil digenerate!",
  //   credentials: {
  //     password: DEMO_PASSWORD,
  //     superAdmin: "superadmin@jivara.test",
  //     adminActive: "admin@jivara.test",
  //     adminPending: "admin.pending@jivara.test",
  //     adminSuspended: "admin.suspended@jivara.test",
  //     adminRejected: "admin.rejected@jivara.test",
  //     nurseExample: "nurse1@jivara.test",
  //     patientExample: "patient1@jivara.test",
  //   }
  // }, null, 2));
};

main()
  .then(() => process.exit(0))
  .catch((_error) => {
    // console.error("Error during seeding:", error);
    process.exit(1);
  });
