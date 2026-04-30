import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  medicationLogs,
  medicationSchedules,
  nurses,
  patientNurseAssignments,
  patients,
  prescriptions,
  users,
} from "../db/schema";
import { AUTH_CONSTANTS } from "../types/auth.types";

const DEMO_PASSWORD = "Demo12345";

const getOrCreateUser = async (data: {
  fullName: string;
  email: string;
  phone: string;
  role: "admin" | "nurse" | "patient";
  gender?: string;
  address?: string;
}) => {
  const existing = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
  if (existing[0]) return existing[0];

  const password = await bcrypt.hash(DEMO_PASSWORD, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);
  const [user] = await db
    .insert(users)
    .values({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      password,
      role: data.role,
      gender: data.gender || null,
      address: data.address || null,
      mustChangePassword: false,
    })
    .returning();

  return user;
};

const getOrCreateNurse = async (userId: string) => {
  const existing = await db.select().from(nurses).where(eq(nurses.userId, userId)).limit(1);
  if (existing[0]) return existing[0];

  const [nurse] = await db
    .insert(nurses)
    .values({
      userId,
      employeeId: "NURSE-DEMO-001",
      department: "Cardiac Care",
    })
    .returning();

  return nurse;
};

const getOrCreatePatient = async (userId: string) => {
  const existing = await db.select().from(patients).where(eq(patients.userId, userId)).limit(1);
  if (existing[0]) return existing[0];

  const [patient] = await db
    .insert(patients)
    .values({
      userId,
      dateOfBirth: "1968-03-15",
      gender: "male",
      address: "Bekasi, Jawa Barat",
      diagnosis: "Post cardiac surgery",
      emergencyContact: {
        name: "Andi Santoso",
        phone: "+6281234567891",
        relationship: "son",
      },
    })
    .returning();

  return patient;
};

const assignPatientToNurse = async (patientId: string, nurseId: string, assignedBy: string) => {
  const existing = await db
    .select()
    .from(patientNurseAssignments)
    .where(eq(patientNurseAssignments.patientId, patientId))
    .limit(1);

  if (existing[0]) return existing[0];

  const [assignment] = await db
    .insert(patientNurseAssignments)
    .values({ patientId, nurseId, assignedBy })
    .returning();

  return assignment;
};

const getOrCreatePrescription = async (patientId: string, createdBy: string) => {
  const existing = await db.select().from(prescriptions).where(eq(prescriptions.patientId, patientId)).limit(1);
  if (existing[0]) return existing[0];

  const [prescription] = await db
    .insert(prescriptions)
    .values({
      patientId,
      diagnosis: "Post cardiac surgery",
      prescribingDoctor: "Dr. Andi Wijaya",
      startDate: "2026-04-20",
      endDate: "2026-06-20",
      createdBy,
    })
    .returning();

  return prescription;
};

const getOrCreateMedicationSchedule = async (patientId: string, prescriptionId: string, createdBy: string) => {
  const existing = await db
    .select()
    .from(medicationSchedules)
    .where(eq(medicationSchedules.patientId, patientId))
    .limit(1);

  if (existing[0]) return existing[0];

  const [schedule] = await db
    .insert(medicationSchedules)
    .values({
      patientId,
      prescriptionId,
      drugName: "Lisinopril",
      dosage: "10mg",
      frequency: 1,
      scheduledTimes: ["07:00"],
      instructions: "Sebelum makan pagi",
      createdBy,
    })
    .returning();

  return schedule;
};

const seedMedicationLogs = async (scheduleId: string, patientId: string) => {
  const existing = await db.select().from(medicationLogs).where(eq(medicationLogs.scheduleId, scheduleId)).limit(1);
  if (existing[0]) return;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(7, 0, 0, 0);

  const today = new Date(now);
  today.setUTCHours(7, 0, 0, 0);

  await db.insert(medicationLogs).values([
    {
      scheduleId,
      patientId,
      scheduledTime: yesterday,
      status: "confirmed",
      confirmedAt: new Date(yesterday.getTime() + 5 * 60 * 1000),
      snoozeCount: 0,
    },
    {
      scheduleId,
      patientId,
      scheduledTime: today,
      status: "snoozed",
      confirmedAt: null,
      snoozeCount: 1,
    },
  ]);
};

const main = async () => {
  const admin = await getOrCreateUser({
    fullName: "Admin Jivara",
    email: "admin@jivara.test",
    phone: "+6281111111111",
    role: "admin",
  });

  const nurseUser = await getOrCreateUser({
    fullName: "Sari Dewi",
    email: "nurse@jivara.test",
    phone: "+6281222222222",
    role: "nurse",
    gender: "female",
    address: "Jakarta Timur",
  });

  const patientUser = await getOrCreateUser({
    fullName: "Budi Santoso",
    email: "patient@jivara.test",
    phone: "+6281333333333",
    role: "patient",
    gender: "male",
    address: "Bekasi, Jawa Barat",
  });

  const nurse = await getOrCreateNurse(nurseUser.id);
  const patient = await getOrCreatePatient(patientUser.id);
  await assignPatientToNurse(patient.id, nurse.id, admin.id);
  const prescription = await getOrCreatePrescription(patient.id, nurseUser.id);
  const schedule = await getOrCreateMedicationSchedule(patient.id, prescription.id, nurseUser.id);
  await seedMedicationLogs(schedule.id, patient.id);

  console.log(JSON.stringify({
    status: "berhasil",
    message: "Data demo berhasil disiapkan",
    credentials: {
      password: DEMO_PASSWORD,
      admin: admin.email,
      nurse: nurseUser.email,
      patient: patientUser.email,
    },
    ids: {
      adminId: admin.id,
      nurseId: nurse.id,
      patientId: patient.id,
      scheduleId: schedule.id,
    },
  }, null, 2));
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
