import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { nurses, patientNurseAssignments, patients } from "../db/schema";

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
  if (user.role === "admin") return null;

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
