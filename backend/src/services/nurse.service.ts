import bcrypt from "bcryptjs";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "../db";
import { nurses, organizations, patientNurseAssignments, users } from "../db/schema";
import { AUTH_CONSTANTS } from "../types/auth.types";
import { NurseCreateDTO, NurseListQuery, NurseUpdateDTO } from "../types/nurse.types";
import { AccessUser, ensureOrganizationIdForUser, getOrganizationIdForUser } from "./access-control.service";
import { writeAuditLog } from "./audit-log.service";

const parsePagination = (query: NurseListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const getNurseByIdInternal = async (nurseId: string, user?: AccessUser) => {
  const organizationId = user?.role === "admin" ? await getOrganizationIdForUser(user.id) : null;
  const conditions = [eq(nurses.id, nurseId)];
  if (user?.role === "admin" && !organizationId) {
    throw { status: 403, message: "Admin belum terhubung ke organisasi", code: "ORGANIZATION_REQUIRED" };
  }
  if (organizationId) conditions.push(eq(nurses.organizationId, organizationId));

  const rows = await db
    .select({
      id: nurses.id,
      organizationId: nurses.organizationId,
      userId: nurses.userId,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      age: users.age,
      gender: users.gender,
      address: users.address,
      employeeId: nurses.employeeId,
      department: nurses.department,
      isActive: nurses.isActive,
      userIsActive: users.isActive,
      createdAt: nurses.createdAt,
    })
    .from(nurses)
    .innerJoin(users, eq(nurses.userId, users.id))
    .where(and(...conditions))
    .limit(1);

  if (rows.length === 0) {
    throw { status: 404, message: "Perawat tidak ditemukan", code: "NURSE_NOT_FOUND" };
  }

  return rows[0];
};

export const listNurses = async (query: NurseListQuery, user?: AccessUser) => {
  const { page, limit, offset } = parsePagination(query);
  const conditions = [eq(users.role, "nurse")];
  const organizationId = user?.role === "admin" ? await getOrganizationIdForUser(user.id) : null;

  if (user?.role === "admin" && !organizationId) {
    return { data: [], meta: { page, limit, total: 0 } };
  }

  if (organizationId) conditions.push(eq(nurses.organizationId, organizationId));

  if (query.status === "active") {
    conditions.push(eq(nurses.isActive, true));
  } else if (query.status === "inactive") {
    conditions.push(eq(nurses.isActive, false));
  }

  if (query.department) conditions.push(eq(nurses.department, query.department));

  if (query.search) {
    const searchCondition = or(
      ilike(users.fullName, `%${query.search}%`),
      ilike(users.email, `%${query.search}%`),
      ilike(users.phone, `%${query.search}%`),
      ilike(nurses.employeeId, `%${query.search}%`),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: nurses.id,
        organizationId: nurses.organizationId,
        userId: nurses.userId,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        age: users.age,
        gender: users.gender,
        address: users.address,
        employeeId: nurses.employeeId,
        department: nurses.department,
        isActive: nurses.isActive,
        createdAt: nurses.createdAt,
      })
      .from(nurses)
      .innerJoin(users, eq(nurses.userId, users.id))
      .where(where)
      .orderBy(desc(nurses.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(nurses)
      .innerJoin(users, eq(nurses.userId, users.id))
      .where(where),
  ]);

  const assignments = rows.length > 0
    ? await db
      .select({ nurseId: patientNurseAssignments.nurseId, total: count() })
      .from(patientNurseAssignments)
      .where(and(
        eq(patientNurseAssignments.isActive, true),
        or(...rows.map((row) => eq(patientNurseAssignments.nurseId, row.id))),
      ))
      .groupBy(patientNurseAssignments.nurseId)
    : [];

  const assignmentMap = new Map(assignments.map((assignment) => [assignment.nurseId, assignment.total]));

  return {
    data: rows.map((row) => ({ ...row, assignedPatients: assignmentMap.get(row.id) || 0 })),
    meta: { page, limit, total: totalRows[0]?.total || 0 },
  };
};

export const getNurseById = async (nurseId: string, user?: AccessUser) => {
  const nurse = await getNurseByIdInternal(nurseId, user);
  const assignedRows = await db
    .select({ total: count() })
    .from(patientNurseAssignments)
    .where(and(
      eq(patientNurseAssignments.nurseId, nurseId),
      eq(patientNurseAssignments.isActive, true),
    ));

  return { ...nurse, assignedPatients: assignedRows[0]?.total || 0 };
};

export const createNurse = async (dto: NurseCreateDTO, user?: AccessUser) => {
  const organizationId = user?.role === "super_admin"
    ? dto.organizationId || null
    : user?.id
      ? await ensureOrganizationIdForUser(user.id)
      : null;

  if (!organizationId) {
    throw { status: 403, message: "Organisasi wajib diisi untuk membuat akun perawat", code: "ORGANIZATION_REQUIRED" };
  }

  if (user?.role === "super_admin") {
    const organization = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    if (organization.length === 0) {
      throw { status: 404, message: "Organisasi tidak ditemukan", code: "ORGANIZATION_NOT_FOUND" };
    }
  }

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.email, dto.email), eq(users.phone, dto.phone || "")))
    .limit(1);

  if (existingUser.length > 0) {
    throw { status: 409, message: "Nomor telepon atau email sudah terdaftar", code: "USER_EXISTS" };
  }

  const hashedPassword = await bcrypt.hash(dto.password, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

  const nurse = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        fullName: dto.fullName,
        organizationId,
        email: dto.email,
        phone: dto.phone || null,
        password: hashedPassword,
        role: "nurse",
        age: dto.age || 0,
        gender: dto.gender || null,
        address: dto.address || null,
        mustChangePassword: true,
      })
      .returning({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, role: users.role });

    const [newNurse] = await tx
      .insert(nurses)
      .values({
        userId: newUser.id,
        organizationId,
        employeeId: dto.employeeId || null,
        department: dto.department || null,
      })
      .returning();

    return { ...newNurse, user: newUser };
  });

  await writeAuditLog({
    userId: user?.id || null,
    action: "nurse.created",
    resourceType: "nurse",
    resourceId: nurse.id,
    changes: { after: { id: nurse.id, userId: nurse.userId, employeeId: nurse.employeeId, department: nurse.department } },
  });

  return nurse;
};

export const updateNurse = async (nurseId: string, dto: NurseUpdateDTO, user?: AccessUser) => {
  const existing = await getNurseByIdInternal(nurseId, user);

  const userUpdates: Partial<typeof users.$inferInsert> = {};
  if (dto.fullName !== undefined) userUpdates.fullName = dto.fullName;
  if (dto.email !== undefined) userUpdates.email = dto.email;
  if (dto.phone !== undefined) userUpdates.phone = dto.phone;
  if (dto.gender !== undefined) userUpdates.gender = dto.gender;
  if (dto.address !== undefined) userUpdates.address = dto.address;
  if (dto.age !== undefined) userUpdates.age = dto.age;
  if (dto.isActive !== undefined) userUpdates.isActive = dto.isActive;

  const nurseUpdates: Partial<typeof nurses.$inferInsert> = {};
  if (dto.employeeId !== undefined) nurseUpdates.employeeId = dto.employeeId;
  if (dto.department !== undefined) nurseUpdates.department = dto.department;
  if (dto.isActive !== undefined) nurseUpdates.isActive = dto.isActive;

  await db.transaction(async (tx) => {
    if (Object.keys(userUpdates).length > 0) {
      await tx.update(users).set({ ...userUpdates, updatedAt: new Date() }).where(eq(users.id, existing.userId));
    }

    if (Object.keys(nurseUpdates).length > 0) {
      await tx.update(nurses).set(nurseUpdates).where(eq(nurses.id, nurseId));
    }
  });

  await writeAuditLog({
    userId: user?.id || null,
    action: "nurse.updated",
    resourceType: "nurse",
    resourceId: nurseId,
    changes: { before: existing, requested: dto },
  });

  return getNurseById(nurseId, user);
};

export const deactivateNurse = async (nurseId: string, user?: AccessUser) => {
  const existing = await getNurseByIdInternal(nurseId, user);

  await db.transaction(async (tx) => {
    await tx.update(nurses).set({ isActive: false }).where(eq(nurses.id, nurseId));
    await tx.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, existing.userId));
    await tx
      .update(patientNurseAssignments)
      .set({ isActive: false })
      .where(and(
        eq(patientNurseAssignments.nurseId, nurseId),
        eq(patientNurseAssignments.isActive, true),
      ));
  });

  await writeAuditLog({
    userId: user?.id || null,
    action: "nurse.deactivated",
    resourceType: "nurse",
    resourceId: nurseId,
    changes: { isActive: { from: existing.isActive, to: false } },
  });
};
