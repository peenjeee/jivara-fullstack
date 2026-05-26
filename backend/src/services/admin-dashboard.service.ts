import { and, count, desc, eq, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "../db";
import { medicationSchedules, notifications, nurses, patientNurseAssignments, patients, users } from "../db/schema";
import { AccessUser, getOrganizationIdForUser, patientScopeCondition, scopedPatientFilter } from "./access-control.service";
import { getAdherenceStats } from "./adherence.service";
import { getMedicationScheduleSummaryForPatients } from "./medication-schedule.service";

type PatientStatus = "On Ideal Schedule" | "Lagging Behind" | "Need Special Attention" | "Complete";
type ActivityCategory = "Reminder" | "Kepatuhan" | "Scan Makanan" | "Administrasi";
type ActivitySeverity = "Info" | "Sukses" | "Peringatan" | "Kritis";

type ScopedPatientRow = {
  id: string;
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: Date | null;
  lastLoginAt: Date | null;
  assignedNurseId: string | null;
};

type ScopedNurseRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  gender: string | null;
  isActive: boolean | null;
};

const previewLimit = 5;

const getAge = (dateOfBirth?: string | null) => {
  if (!dateOfBirth) return 0;

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayPassed = today.getMonth() > birthDate.getMonth()
    || today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate();
  if (!birthdayPassed) age -= 1;
  return Math.max(age, 0);
};

const getInitials = (name: string) => name
  .split(" ")
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join("")
  .toUpperCase() || "PX";

const getFinalPatientStatus = (adherence: number, totalScheduled: number, isMedicationComplete: boolean): PatientStatus => {
  if (isMedicationComplete) return "Complete";
  if (totalScheduled <= 0) return "On Ideal Schedule";
  if (adherence < 50) return "Need Special Attention";
  if (adherence < 75) return "Lagging Behind";
  return "On Ideal Schedule";
};

const formatLastLogin = (value: Date | null) => value
  ? value.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
  : "Belum pernah login";

const normalizeActivitySeverity = (urgency: string | null): ActivitySeverity => (
  urgency === "critical" ? "Kritis" : "Peringatan"
);

const normalizeActivityCategory = (type: string | null): ActivityCategory => {
  if (!type) return "Reminder";
  if (/food/i.test(type)) return "Scan Makanan";
  if (/adherence|escalation|missed|critical/i.test(type)) return "Kepatuhan";
  if (/admin|approval|system/i.test(type)) return "Administrasi";
  return "Reminder";
};

const listScopedNurses = async (user?: AccessUser): Promise<ScopedNurseRow[]> => {
  const organizationId = user?.role === "admin" ? await getOrganizationIdForUser(user.id) : null;
  if (user?.role === "admin" && !organizationId) return [];

  const conditions: SQL[] = organizationId ? [eq(nurses.organizationId, organizationId)] : [];

  return db
    .select({
      id: nurses.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      gender: users.gender,
      isActive: nurses.isActive,
    })
    .from(nurses)
    .innerJoin(users, eq(nurses.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);
};

const listScopedPatients = async (user?: AccessUser): Promise<ScopedPatientRow[]> => {
  const scopedFilter = await scopedPatientFilter(patients.id, user);
  if (!scopedFilter.scope.allowed) return [];

  const conditions: SQL[] = [eq(patients.isActive, true)];
  if (scopedFilter.condition) conditions.push(scopedFilter.condition);

  return db
    .select({
      id: patients.id,
      fullName: users.fullName,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      email: users.email,
      phone: users.phone,
      address: patients.address,
      createdAt: patients.createdAt,
      lastLoginAt: users.lastLoginAt,
      assignedNurseId: patientNurseAssignments.nurseId,
    })
    .from(patients)
    .innerJoin(users, eq(patients.userId, users.id))
    .leftJoin(patientNurseAssignments, and(
      eq(patientNurseAssignments.patientId, patients.id),
      eq(patientNurseAssignments.isActive, true),
    ))
    .where(and(...conditions));
};

const listPriorityNotifications = async (user: AccessUser | undefined, patientRows: ScopedPatientRow[]) => {
  const scope = await patientScopeCondition(user);
  if (!scope.allowed) return [];

  const patientNames = new Map(patientRows.map((patient) => [patient.id, patient.fullName]));
  const conditions: SQL[] = [inArray(notifications.urgency, ["high", "urgent", "critical"])];

  if (scope.patientIds !== null) {
    if (scope.patientIds.length === 0) return [];
    conditions.push(inArray(notifications.patientId, scope.patientIds));
  }

  const rows = await db
    .select({
      id: notifications.id,
      patientId: notifications.patientId,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      urgency: notifications.urgency,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(previewLimit);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.body,
    category: normalizeActivityCategory(row.type),
    severity: normalizeActivitySeverity(row.urgency),
    timestamp: row.createdAt?.toISOString() || new Date().toISOString(),
    patientId: row.patientId,
    patientName: patientNames.get(row.patientId),
    patientAvatar: patientNames.get(row.patientId) ? getInitials(patientNames.get(row.patientId)!) : undefined,
    read: false,
  }));
};

export const getAdminDashboardData = async (user?: AccessUser) => {
  const [nurseRows, patientRows] = await Promise.all([
    listScopedNurses(user),
    listScopedPatients(user),
  ]);

  const nurseById = new Map(nurseRows.map((nurse) => [nurse.id, nurse]));
  const uniquePatientRows = Array.from(patientRows.reduce((patientsById, patient) => {
    const existingPatient = patientsById.get(patient.id);
    if (!existingPatient || !existingPatient.assignedNurseId && patient.assignedNurseId) {
      patientsById.set(patient.id, patient);
    }
    return patientsById;
  }, new Map<string, ScopedPatientRow>()).values());
  const scheduleSummary = await getMedicationScheduleSummaryForPatients(uniquePatientRows.map((patient) => patient.id));
  const assignedPatientIdsByNurse = new Map<string, Set<string>>();
  patientRows.forEach((patient) => {
    if (!patient.assignedNurseId) return;
    const patientIds = assignedPatientIdsByNurse.get(patient.assignedNurseId) ?? new Set<string>();
    patientIds.add(patient.id);
    assignedPatientIdsByNurse.set(patient.assignedNurseId, patientIds);
  });

  // Batch check medication completion for all unique patients
  const allUniqueIds = uniquePatientRows.map((patient) => patient.id);
  const activeSchedules = allUniqueIds.length > 0
    ? await db
        .select({
          patientId: medicationSchedules.patientId,
          stock: medicationSchedules.stock,
        })
        .from(medicationSchedules)
        .where(and(
          inArray(medicationSchedules.patientId, allUniqueIds),
          eq(medicationSchedules.isActive, true),
        ))
    : [];
  const schedulesByPatientId = new Map<string, number[]>();
  for (const s of activeSchedules) {
    const stocks = schedulesByPatientId.get(s.patientId) ?? [];
    stocks.push(s.stock ?? 0);
    schedulesByPatientId.set(s.patientId, stocks);
  }

  const patientInsights = await Promise.all(uniquePatientRows.map(async (patient) => {
    const adherence = await getAdherenceStats({ patientId: patient.id, period: "30d" }, user).catch(() => null);
    const adherenceRate = Math.round(adherence?.adherenceRate ?? 100);
    const totalScheduled = adherence?.totalScheduled ?? 0;
    const stocks = schedulesByPatientId.get(patient.id) ?? [];
    const isMedicationComplete = stocks.length > 0 && stocks.every((stock) => (stock ?? 0) <= 0);
    const status = getFinalPatientStatus(adherenceRate, totalScheduled, isMedicationComplete);

    return {
      id: patient.id,
      name: patient.fullName,
      age: getAge(patient.dateOfBirth),
      gender: patient.gender === "female" ? "Wanita" as const : "Pria" as const,
      phone: patient.phone ?? undefined,
      email: patient.email ?? undefined,
      address: patient.address ?? undefined,
      status,
      lastVisit: formatLastLogin(patient.lastLoginAt),
      adherence: adherenceRate,
      avatar: getInitials(patient.fullName),
      assignedNurseId: patient.assignedNurseId ?? undefined,
      assignedNurseName: patient.assignedNurseId ? nurseById.get(patient.assignedNurseId)?.fullName : undefined,
    };
  }));

  const riskyPatients = patientInsights
    .filter((patient) => patient.status !== "On Ideal Schedule" && patient.status !== "Complete")
    .sort((first, second) => first.adherence - second.adherence);

  const riskyPatientIds = new Set(riskyPatients.map((patient) => patient.id));
  const riskyPatientCount = new Map<string, number>();
  patientRows.forEach((patient) => {
    if (!patient.assignedNurseId || !riskyPatientIds.has(patient.id)) return;
    riskyPatientCount.set(patient.assignedNurseId, (riskyPatientCount.get(patient.assignedNurseId) || 0) + 1);
  });

  const nurseFollowUps = Array.from(riskyPatientCount.entries())
    .map(([nurseId, riskyCount]) => {
      const nurse = nurseById.get(nurseId);
      if (!nurse) return null;
      return {
        nurse: {
          id: nurse.id,
          fullName: nurse.fullName,
          email: nurse.email,
          phone: nurse.phone ?? "",
          gender: nurse.gender === "male" ? "Pria" as const : "Wanita" as const,
          status: nurse.isActive ? "Aktif" as const : "Nonaktif" as const,
          joinedAt: "",
          temporaryPassword: false,
          assignedPatients: assignedPatientIdsByNurse.get(nurse.id)?.size || 0,
        },
        assignedPatientCount: assignedPatientIdsByNurse.get(nurse.id)?.size || 0,
        riskyPatientCount: riskyCount,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((first, second) => second.riskyPatientCount - first.riskyPatientCount)
    .slice(0, previewLimit);

  const priorityActivities = await listPriorityNotifications(user, patientRows);

  return {
    summary: {
      totalNurses: nurseRows.length,
      totalActivePatients: uniquePatientRows.length,
      totalActiveSchedules: scheduleSummary.active,
    },
    nurseFollowUps,
    riskyPatients: riskyPatients.slice(0, previewLimit),
    priorityActivities,
  };
};

export const getNurseDashboardSummary = async (user?: AccessUser) => {
  const scope = await patientScopeCondition(user);
  if (!scope.allowed) {
    return {
      totalActivePatients: 0,
      warningCriticalNotifications: 0,
      overallAdherence: 0,
    };
  }

  const patientConditions: SQL[] = [eq(patients.isActive, true)];
  const notificationConditions: SQL[] = [inArray(notifications.urgency, ["high", "urgent", "critical"])];

  if (scope.patientIds !== null) {
    if (scope.patientIds.length === 0) {
      return {
        totalActivePatients: 0,
        warningCriticalNotifications: 0,
        overallAdherence: 0,
      };
    }
    patientConditions.push(inArray(patients.id, scope.patientIds));
    notificationConditions.push(inArray(notifications.patientId, scope.patientIds));
  }

  const [patientRows, notificationRows, adherence] = await Promise.all([
    db
      .select({ total: count() })
      .from(patients)
      .where(and(...patientConditions)),
    db
      .select({ total: count() })
      .from(notifications)
      .where(and(...notificationConditions)),
    getAdherenceStats({ period: "all" }, user),
  ]);

  return {
    totalActivePatients: patientRows[0]?.total || 0,
    warningCriticalNotifications: notificationRows[0]?.total || 0,
    overallAdherence: Math.round(adherence.adherenceRate),
  };
};
