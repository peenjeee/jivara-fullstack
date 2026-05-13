import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { medicationSchedules, patients, prescriptions } from "../db/schema";
import {
  PrescriptionCreateDTO,
  PrescriptionListQuery,
  PrescriptionUpdateDTO,
} from "../types/prescription.types";
import { AccessUser, assertCanAccessPatient, scopedPatientFilter } from "./access-control.service";
import { diffChanges, writeAuditLog } from "./audit-log.service";

const ensurePatientExists = async (patientId: string) => {
  const patient = await db.select({ id: patients.id }).from(patients).where(eq(patients.id, patientId)).limit(1);
  if (patient.length === 0) {
    throw { status: 404, message: "Pasien tidak ditemukan", code: "PATIENT_NOT_FOUND" };
  }
};

export const listPrescriptions = async (query: PrescriptionListQuery, user?: AccessUser) => {
  const patientId = query.patientId || query.patient_id;
  const scopedFilter = await scopedPatientFilter(prescriptions.patientId, user, patientId);

  if (!scopedFilter.scope.allowed) return [];

  const where = scopedFilter.condition || undefined;

  const rows = await db
    .select()
    .from(prescriptions)
    .where(where)
    .orderBy(desc(prescriptions.createdAt));

  return Promise.all(rows.map(async (prescription) => {
    const medications = await db
      .select({
        id: medicationSchedules.id,
        drugName: medicationSchedules.drugName,
        dosage: medicationSchedules.dosage,
        frequency: medicationSchedules.frequency,
        scheduledTimes: medicationSchedules.scheduledTimes,
        isActive: medicationSchedules.isActive,
      })
      .from(medicationSchedules)
      .where(and(
        eq(medicationSchedules.prescriptionId, prescription.id),
        eq(medicationSchedules.isActive, true),
      ));

    return { ...prescription, medications };
  }));
};

export const getPrescriptionById = async (id: string, user?: AccessUser) => {
  const prescription = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);

  if (prescription.length === 0) {
    throw { status: 404, message: "Resep tidak ditemukan", code: "PRESCRIPTION_NOT_FOUND" };
  }

  if (user) await assertCanAccessPatient(user, prescription[0].patientId);

  const medications = await db
    .select({
      id: medicationSchedules.id,
      drugName: medicationSchedules.drugName,
      dosage: medicationSchedules.dosage,
      frequency: medicationSchedules.frequency,
      scheduledTimes: medicationSchedules.scheduledTimes,
      isActive: medicationSchedules.isActive,
    })
    .from(medicationSchedules)
    .where(eq(medicationSchedules.prescriptionId, id));

  return { ...prescription[0], medications };
};

export const createPrescription = async (dto: PrescriptionCreateDTO, createdBy?: string, user?: AccessUser) => {
  await ensurePatientExists(dto.patientId);
  if (user) await assertCanAccessPatient(user, dto.patientId);

  const [prescription] = await db
    .insert(prescriptions)
    .values({
      patientId: dto.patientId,
      diagnosis: dto.diagnosis || null,
      prescribingDoctor: dto.prescribingDoctor || null,
      startDate: dto.startDate || null,
      endDate: dto.endDate || null,
      createdBy: createdBy || null,
    })
    .returning();

  await writeAuditLog({
    userId: createdBy || user?.id || null,
    action: "prescription.created",
    resourceType: "prescription",
    resourceId: prescription.id,
    changes: { after: prescription },
  });

  return { ...prescription, medications: [] };
};

export const updatePrescription = async (id: string, dto: PrescriptionUpdateDTO, user?: AccessUser) => {
  const existing = await getPrescriptionById(id, user);

  const updates: Partial<typeof prescriptions.$inferInsert> = {};
  if (dto.diagnosis !== undefined) updates.diagnosis = dto.diagnosis;
  if (dto.prescribingDoctor !== undefined) updates.prescribingDoctor = dto.prescribingDoctor;
  if (dto.startDate !== undefined) updates.startDate = dto.startDate;
  if (dto.endDate !== undefined) updates.endDate = dto.endDate;

  const [prescription] = await db
    .update(prescriptions)
    .set(updates)
    .where(eq(prescriptions.id, id))
    .returning();

  const changes = diffChanges(existing, prescription, ["diagnosis", "prescribingDoctor", "startDate", "endDate"]);
  if (Object.keys(changes).length > 0) {
    await writeAuditLog({
      userId: user?.id || null,
      action: "prescription.updated",
      resourceType: "prescription",
      resourceId: id,
      changes,
    });
  }

  return getPrescriptionById(prescription.id, user);
};

export const deletePrescription = async (id: string, user?: AccessUser) => {
  const existing = await getPrescriptionById(id, user);

  await db.transaction(async (tx) => {
    await tx
      .update(medicationSchedules)
      .set({ prescriptionId: null, updatedAt: new Date() })
      .where(eq(medicationSchedules.prescriptionId, id));

    await tx.delete(prescriptions).where(eq(prescriptions.id, id));
  });

  await writeAuditLog({
    userId: user?.id || null,
    action: "prescription.deleted",
    resourceType: "prescription",
    resourceId: id,
    changes: { before: { id: existing.id, patientId: existing.patientId, diagnosis: existing.diagnosis } },
  });
};
