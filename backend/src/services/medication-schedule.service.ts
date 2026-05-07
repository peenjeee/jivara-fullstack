import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { medicationSchedules, patients, prescriptions } from "../db/schema";
import {
  MedicationScheduleCreateDTO,
  MedicationScheduleListQuery,
  MedicationScheduleUpdateDTO,
} from "../types/medication-schedule.types";
import { AccessUser, assertCanAccessPatient, scopedPatientFilter } from "./access-control.service";
import { diffChanges, writeAuditLog } from "./audit-log.service";

const getBooleanFilter = (value?: string) => {
  if (value === undefined || value === "all") return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return undefined;
};

const ensurePatientExists = async (patientId: string) => {
  const patient = await db.select({ id: patients.id }).from(patients).where(eq(patients.id, patientId)).limit(1);
  if (patient.length === 0) {
    throw { status: 404, message: "Pasien tidak ditemukan", code: "PATIENT_NOT_FOUND" };
  }
};

const ensurePrescriptionExists = async (prescriptionId: string) => {
  const prescription = await db.select({ id: prescriptions.id }).from(prescriptions).where(eq(prescriptions.id, prescriptionId)).limit(1);
  if (prescription.length === 0) {
    throw { status: 404, message: "Resep tidak ditemukan", code: "PRESCRIPTION_NOT_FOUND" };
  }
};

export const listMedicationSchedules = async (query: MedicationScheduleListQuery, user?: AccessUser) => {
  const patientId = query.patientId || query.patient_id;
  const activeFilter = getBooleanFilter(query.isActive || query.is_active);
  const conditions = [];
  const scopedFilter = await scopedPatientFilter(medicationSchedules.patientId, user, patientId);

  if (!scopedFilter.scope.allowed) return [];
  if (scopedFilter.condition) conditions.push(scopedFilter.condition);

  if (activeFilter !== undefined) conditions.push(eq(medicationSchedules.isActive, activeFilter));

  return db
    .select()
    .from(medicationSchedules)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(medicationSchedules.createdAt));
};

export const getMedicationScheduleById = async (id: string, user?: AccessUser) => {
  const schedule = await db.select().from(medicationSchedules).where(eq(medicationSchedules.id, id)).limit(1);

  if (schedule.length === 0) {
    throw { status: 404, message: "Jadwal obat tidak ditemukan", code: "SCHEDULE_NOT_FOUND" };
  }

  if (user) await assertCanAccessPatient(user, schedule[0].patientId);

  return schedule[0];
};

export const createMedicationSchedule = async (dto: MedicationScheduleCreateDTO, createdBy?: string, user?: AccessUser) => {
  await ensurePatientExists(dto.patientId);
  if (user) await assertCanAccessPatient(user, dto.patientId);
  if (dto.prescriptionId) await ensurePrescriptionExists(dto.prescriptionId);

  const [schedule] = await db
    .insert(medicationSchedules)
    .values({
      patientId: dto.patientId,
      prescriptionId: dto.prescriptionId || null,
      drugName: dto.drugName,
      dosage: dto.dosage,
      frequency: dto.frequency,
      scheduledTimes: dto.scheduledTimes,
      instructions: dto.instructions || null,
      createdBy: createdBy || null,
    })
    .returning();

  await writeAuditLog({
    userId: createdBy || user?.id || null,
    action: "medication_schedule.created",
    resourceType: "medication_schedule",
    resourceId: schedule.id,
    changes: { after: schedule },
  });

  return schedule;
};

export const updateMedicationSchedule = async (id: string, dto: MedicationScheduleUpdateDTO, user?: AccessUser) => {
  const existing = await getMedicationScheduleById(id, user);

  if (dto.prescriptionId) await ensurePrescriptionExists(dto.prescriptionId);

  const updates: Partial<typeof medicationSchedules.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (dto.prescriptionId !== undefined) updates.prescriptionId = dto.prescriptionId;
  if (dto.drugName !== undefined) updates.drugName = dto.drugName;
  if (dto.dosage !== undefined) updates.dosage = dto.dosage;
  if (dto.frequency !== undefined) updates.frequency = dto.frequency;
  if (dto.scheduledTimes !== undefined) updates.scheduledTimes = dto.scheduledTimes;
  if (dto.instructions !== undefined) updates.instructions = dto.instructions;
  if (dto.isActive !== undefined) updates.isActive = dto.isActive;

  const [schedule] = await db
    .update(medicationSchedules)
    .set(updates)
    .where(eq(medicationSchedules.id, id))
    .returning();

  const changes = diffChanges(existing, schedule, ["prescriptionId", "drugName", "dosage", "frequency", "scheduledTimes", "instructions", "isActive"]);
  if (Object.keys(changes).length > 0) {
    await writeAuditLog({
      userId: user?.id || null,
      action: "medication_schedule.updated",
      resourceType: "medication_schedule",
      resourceId: id,
      changes,
    });
  }

  return schedule;
};

export const deactivateMedicationSchedule = async (id: string, user?: AccessUser) => {
  const existing = await getMedicationScheduleById(id, user);

  await db
    .update(medicationSchedules)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(medicationSchedules.id, id));

  await writeAuditLog({
    userId: user?.id || null,
    action: "medication_schedule.deactivated",
    resourceType: "medication_schedule",
    resourceId: id,
    changes: { isActive: { from: existing.isActive, to: false } },
  });
};
