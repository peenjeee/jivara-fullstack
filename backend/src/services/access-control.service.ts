import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { nurses, organizations, patientNurseAssignments, patients, users } from "../db/schema";

export type AccessUser = {
  id: string;
  email: string;
  role: string;
};

const forbidden = () => ({
  status: 403,
  message: "Anda tidak memiliki izin untuk mengakses data pasien ini",
  code: "FORBIDDEN",
});

export const getPatientIdForUser = async (userId: string) => {
  const row = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.userId, userId))
    .limit(1);

  return row[0]?.id || null;
};

export const getNurseIdForUser = async (userId: string) => {
  const row = await db
    .select({ id: nurses.id })
    .from(nurses)
    .where(eq(nurses.userId, userId))
    .limit(1);

  return row[0]?.id || null;
};

export const getOrganizationIdForUser = async (userId: string) => {
  const row = await db
    .select({ organizationId: users.organizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row[0]?.organizationId || null;
};

export const ensureOrganizationIdForUser = async (userId: string) => {
  const row = await db
    .select({ id: users.id, fullName: users.fullName, role: users.role, organizationId: users.organizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = row[0];
  if (!user) return null;
  if (user.organizationId) return user.organizationId;
  if (user.role !== "admin" && user.role !== "nurse") return null;

  return db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({ name: `${user.fullName} Organization` })
      .returning({ id: organizations.id });

    await tx.update(users).set({ organizationId: organization.id, updatedAt: new Date() }).where(eq(users.id, user.id));

    if (user.role === "nurse") {
      await tx.update(nurses).set({ organizationId: organization.id }).where(eq(nurses.userId, user.id));
    }

    return organization.id;
  });
};

export const getAssignedPatientIdsForNurse = async (nurseId: string) => {
  const rows = await db
    .select({ patientId: patientNurseAssignments.patientId })
    .from(patientNurseAssignments)
    .where(and(
      eq(patientNurseAssignments.nurseId, nurseId),
      eq(patientNurseAssignments.isActive, true),
    ));

  return rows.map((row) => row.patientId);
};

export const getAccessiblePatientIds = async (user?: AccessUser) => {
  if (!user) return [];
  if (user.role === "super_admin") return null;

  if (user.role === "admin") {
    const organizationId = await getOrganizationIdForUser(user.id);
    if (!organizationId) return [];

    const rows = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.organizationId, organizationId));

    return rows.map((row) => row.id);
  }

  if (user.role === "patient") {
    const patientId = await getPatientIdForUser(user.id);
    return patientId ? [patientId] : [];
  }

  if (user.role === "nurse") {
    const nurseId = await getNurseIdForUser(user.id);
    return nurseId ? getAssignedPatientIdsForNurse(nurseId) : [];
  }

  return [];
};

export const assertCanAccessPatient = async (user: AccessUser | undefined, patientId: string) => {
  const accessiblePatientIds = await getAccessiblePatientIds(user);
  if (accessiblePatientIds === null) return;
  if (accessiblePatientIds.includes(patientId)) return;

  throw forbidden();
};

export const patientScopeCondition = async (user?: AccessUser, explicitPatientId?: string) => {
  const accessiblePatientIds = await getAccessiblePatientIds(user);

  if (accessiblePatientIds === null) {
    return explicitPatientId ? { allowed: true, patientIds: [explicitPatientId] } : { allowed: true, patientIds: null };
  }

  if (explicitPatientId) {
    return accessiblePatientIds.includes(explicitPatientId)
      ? { allowed: true, patientIds: [explicitPatientId] }
      : { allowed: false, patientIds: [] };
  }

  return { allowed: accessiblePatientIds.length > 0, patientIds: accessiblePatientIds };
};

export const scopedPatientFilter = async <TColumn>(
  column: TColumn,
  user?: AccessUser,
  explicitPatientId?: string,
) => {
  const scope = await patientScopeCondition(user, explicitPatientId);
  if (!scope.allowed) return { scope, condition: null };
  if (scope.patientIds === null) return { scope, condition: null };
  if (scope.patientIds.length === 1) return { scope, condition: eq(column as never, scope.patientIds[0]) };
  return { scope, condition: inArray(column as never, scope.patientIds) };
};
