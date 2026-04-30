import bcrypt from "bcryptjs";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "../db";
import {
  nurses,
  patientNurseAssignments,
  patients,
  users,
} from "../db/schema";
import { AUTH_CONSTANTS } from "../types/auth.types";
import {
  PatientCreateDTO,
  PatientListQuery,
  PatientUpdateDTO,
} from "../types/patient.types";

const parsePagination = (query: PatientListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

export const listPatients = async (query: PatientListQuery) => {
  const { page, limit, offset } = parsePagination(query);
  const conditions = [];

  if (query.status === "active") {
    conditions.push(eq(patients.isActive, true));
  } else if (query.status === "inactive") {
    conditions.push(eq(patients.isActive, false));
  }

  if (query.search) {
    conditions.push(or(
      ilike(users.fullName, `%${query.search}%`),
      ilike(users.phone, `%${query.search}%`),
      ilike(users.email, `%${query.search}%`),
    ));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: patients.id,
        userId: patients.userId,
        fullName: users.fullName,
        phone: users.phone,
        email: users.email,
        dateOfBirth: patients.dateOfBirth,
        gender: patients.gender,
        address: patients.address,
        diagnosis: patients.diagnosis,
        emergencyContact: patients.emergencyContact,
        isActive: patients.isActive,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .innerJoin(users, eq(patients.userId, users.id))
      .where(where)
      .orderBy(desc(patients.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(patients)
      .innerJoin(users, eq(patients.userId, users.id))
      .where(where),
  ]);

  return {
    data: rows,
    meta: {
      page,
      limit,
      total: totalRows[0]?.total || 0,
    },
  };
};

export const getPatientById = async (patientId: string) => {
  const row = await db
    .select({
      id: patients.id,
      userId: patients.userId,
      fullName: users.fullName,
      phone: users.phone,
      email: users.email,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      address: patients.address,
      diagnosis: patients.diagnosis,
      emergencyContact: patients.emergencyContact,
      isActive: patients.isActive,
      registeredAt: patients.createdAt,
    })
    .from(patients)
    .innerJoin(users, eq(patients.userId, users.id))
    .where(eq(patients.id, patientId))
    .limit(1);

  if (row.length === 0) {
    throw { status: 404, message: "Pasien tidak ditemukan", code: "PATIENT_NOT_FOUND" };
  }

  const assignment = await db
    .select({ nurseId: patientNurseAssignments.nurseId })
    .from(patientNurseAssignments)
    .where(and(
      eq(patientNurseAssignments.patientId, patientId),
      eq(patientNurseAssignments.isActive, true),
    ))
    .limit(1);

  return {
    ...row[0],
    assignedNurseId: assignment[0]?.nurseId || null,
  };
};

export const createPatient = async (dto: PatientCreateDTO, createdBy?: string) => {
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.email, dto.email), eq(users.phone, dto.phone || "")))
    .limit(1);

  if (existingUser.length > 0) {
    throw { status: 409, message: "Nomor telepon atau email sudah terdaftar", code: "USER_EXISTS" };
  }

  if (dto.assignedNurseId) {
    const nurse = await db.select({ id: nurses.id }).from(nurses).where(eq(nurses.id, dto.assignedNurseId)).limit(1);
    if (nurse.length === 0) {
      throw { status: 404, message: "Perawat tidak ditemukan", code: "NURSE_NOT_FOUND" };
    }
  }

  const hashedPassword = await bcrypt.hash(dto.password, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

  return db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone || null,
        password: hashedPassword,
        role: "patient",
        gender: dto.gender || null,
        address: dto.address || null,
        mustChangePassword: true,
      })
      .returning({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, role: users.role });

    const [newPatient] = await tx
      .insert(patients)
      .values({
        userId: newUser.id,
        dateOfBirth: dto.dateOfBirth || null,
        gender: dto.gender || null,
        address: dto.address || null,
        diagnosis: dto.diagnosis || null,
        emergencyContact: dto.emergencyContact || null,
      })
      .returning();

    if (dto.assignedNurseId) {
      await tx.insert(patientNurseAssignments).values({
        patientId: newPatient.id,
        nurseId: dto.assignedNurseId,
        assignedBy: createdBy || null,
      });
    }

    return {
      ...newPatient,
      user: newUser,
      assignedNurseId: dto.assignedNurseId || null,
    };
  });
};

export const updatePatient = async (patientId: string, dto: PatientUpdateDTO) => {
  const existing = await getPatientById(patientId);

  const userUpdates: Partial<typeof users.$inferInsert> = {};
  if (dto.fullName !== undefined) userUpdates.fullName = dto.fullName;
  if (dto.email !== undefined) userUpdates.email = dto.email;
  if (dto.phone !== undefined) userUpdates.phone = dto.phone;
  if (dto.gender !== undefined) userUpdates.gender = dto.gender;
  if (dto.address !== undefined) userUpdates.address = dto.address;
  if (dto.isActive !== undefined) userUpdates.isActive = dto.isActive;

  const patientUpdates: Partial<typeof patients.$inferInsert> = {};
  if (dto.dateOfBirth !== undefined) patientUpdates.dateOfBirth = dto.dateOfBirth;
  if (dto.gender !== undefined) patientUpdates.gender = dto.gender;
  if (dto.address !== undefined) patientUpdates.address = dto.address;
  if (dto.diagnosis !== undefined) patientUpdates.diagnosis = dto.diagnosis;
  if (dto.emergencyContact !== undefined) patientUpdates.emergencyContact = dto.emergencyContact;
  if (dto.isActive !== undefined) patientUpdates.isActive = dto.isActive;

  await db.transaction(async (tx) => {
    if (Object.keys(userUpdates).length > 0) {
      await tx.update(users).set({ ...userUpdates, updatedAt: new Date() }).where(eq(users.id, existing.userId));
    }

    if (Object.keys(patientUpdates).length > 0) {
      await tx.update(patients).set(patientUpdates).where(eq(patients.id, patientId));
    }
  });

  return getPatientById(patientId);
};

export const assignPatient = async (patientId: string, nurseId: string, assignedBy?: string) => {
  await getPatientById(patientId);

  const nurse = await db.select({ id: nurses.id }).from(nurses).where(eq(nurses.id, nurseId)).limit(1);
  if (nurse.length === 0) {
    throw { status: 404, message: "Perawat tidak ditemukan", code: "NURSE_NOT_FOUND" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(patientNurseAssignments)
      .set({ isActive: false })
      .where(and(
        eq(patientNurseAssignments.patientId, patientId),
        eq(patientNurseAssignments.isActive, true),
      ));

    await tx.insert(patientNurseAssignments).values({
      patientId,
      nurseId,
      assignedBy: assignedBy || null,
    });
  });

  return getPatientById(patientId);
};

export const deactivatePatient = async (patientId: string) => {
  const existing = await getPatientById(patientId);

  await db.transaction(async (tx) => {
    await tx.update(patients).set({ isActive: false }).where(eq(patients.id, patientId));
    await tx.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, existing.userId));
  });
};
