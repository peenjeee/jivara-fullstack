import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "../db";
import { activityReads, medicationSchedules, notifications, nurses, patientNurseAssignments, patients, users } from "../db/schema";
import { AccessUser, getOrganizationIdForUser, patientScopeCondition, scopedPatientFilter } from "./access-control.service";
import { getAdherenceStats } from "./adherence.service";
import { getMedicationScheduleSummaryForPatients } from "./medication-schedule.service";
import { listPatients } from "./patient.service";

type PatientStatus = "On Ideal Schedule" | "Lagging Behind" | "Need Special Attention" | "Complete" | "Nonaktif";
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
  isActive: boolean | null;
  assignedNurseId: string | null;
  assignmentIsActive: boolean | null;
  assignmentAssignedAt: Date | null;
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

type PatientAssignmentCandidate = {
  id: string;
  assignedNurseId: string | null;
  assignmentIsActive: boolean | null;
  assignmentAssignedAt: Date | null;
};

export const selectCurrentPatientAssignmentRows = <TRow extends PatientAssignmentCandidate>(rows: TRow[]) => {
  const rowsByPatientId = rows.reduce((groups, row) => {
    const patientRows = groups.get(row.id) ?? [];
    patientRows.push(row);
    groups.set(row.id, patientRows);
    return groups;
  }, new Map<string, TRow[]>());

  return Array.from(rowsByPatientId.values()).flatMap((patientRows) => {
    const activeAssignments = patientRows.filter((row) => row.assignedNurseId && row.assignmentIsActive === true);
    if (activeAssignments.length > 0) return activeAssignments;

    const assignedRows = patientRows.filter((row) => row.assignedNurseId);
    if (assignedRows.length === 0) return patientRows.slice(0, 1);

    const latestAssignedAt = Math.max(...assignedRows.map((row) => row.assignmentAssignedAt?.getTime() ?? 0));
    return assignedRows.filter((row) => (row.assignmentAssignedAt?.getTime() ?? 0) === latestAssignedAt);
  });
};

export const buildNurseFollowUps = (
  nurseRows: ScopedNurseRow[],
  assignedPatientIdsByNurse: Map<string, Set<string>>,
  riskyPatientCount: Map<string, number>,
) => nurseRows
  .map((nurse) => {
    const assignedPatientCount = assignedPatientIdsByNurse.get(nurse.id)?.size || 0;
    const riskyCount = riskyPatientCount.get(nurse.id) || 0;
    const needsReassign = nurse.isActive === false && assignedPatientCount > 0;

    if (!needsReassign && riskyCount <= 0) return null;

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
        assignedPatients: assignedPatientCount,
      },
      assignedPatientCount,
      riskyPatientCount: riskyCount,
      needsReassign,
    };
  })
  .filter((item): item is NonNullable<typeof item> => Boolean(item))
  .sort((first, second) => {
    if (first.needsReassign !== second.needsReassign) return first.needsReassign ? -1 : 1;
    if (first.riskyPatientCount !== second.riskyPatientCount) return second.riskyPatientCount - first.riskyPatientCount;
    return second.assignedPatientCount - first.assignedPatientCount;
  })
  .slice(0, previewLimit)
  .map((item) => ({
    nurse: item.nurse,
    assignedPatientCount: item.assignedPatientCount,
    riskyPatientCount: item.riskyPatientCount,
  }));

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

  const conditions: SQL[] = [];
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
      isActive: patients.isActive,
      assignedNurseId: patientNurseAssignments.nurseId,
      assignmentIsActive: patientNurseAssignments.isActive,
      assignmentAssignedAt: patientNurseAssignments.assignedAt,
    })
    .from(patients)
    .innerJoin(users, eq(patients.userId, users.id))
    .leftJoin(patientNurseAssignments, eq(patientNurseAssignments.patientId, patients.id))
    .where(and(...conditions));
};

const countScopedPatients = async (user?: AccessUser) => {
  const scopedFilter = await scopedPatientFilter(patients.id, user);
  if (!scopedFilter.scope.allowed) return 0;

  const rows = await db
    .select({ total: count() })
    .from(patients)
    .where(scopedFilter.condition ?? undefined);

  return rows[0]?.total || 0;
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

const getInactiveNurseReassignPatients = async (nurseId: string, user?: AccessUser) => {
  const firstPage = await listPatients({ page: "1", limit: "100", status: "active", nurseId }, user);
  const patientRows = [...firstPage.data];
  const totalPages = Math.ceil(firstPage.meta.total / firstPage.meta.limit);

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await listPatients({ page: String(page), limit: String(firstPage.meta.limit), status: "active", nurseId }, user);
    patientRows.push(...nextPage.data);
  }

  return patientRows.filter((patient) => !patient.isMedicationComplete);
};

const getInactiveNurseReassignData = async (nurseRows: ScopedNurseRow[], user?: AccessUser) => {
  const inactiveNurses = nurseRows.filter((nurse) => nurse.isActive === false);
  const inactiveNursePatients = await Promise.all(inactiveNurses.map(async (nurse) => ({
    nurseId: nurse.id,
    patients: await getInactiveNurseReassignPatients(nurse.id, user).catch(() => []),
  })));

  return inactiveNursePatients.reduce((assignedPatientsByNurse, item) => {
    if (item.patients.length === 0) return assignedPatientsByNurse;
    assignedPatientsByNurse.set(item.nurseId, new Set(item.patients.map((patient) => patient.id)));
    return assignedPatientsByNurse;
  }, new Map<string, Set<string>>());
};

export const getAdminDashboardData = async (user?: AccessUser) => {
  const [nurseRows, patientRows, totalPatients] = await Promise.all([
    listScopedNurses(user),
    listScopedPatients(user),
    countScopedPatients(user),
  ]);

  const currentPatientRows = selectCurrentPatientAssignmentRows(patientRows);
  const nurseById = new Map(nurseRows.map((nurse) => [nurse.id, nurse]));
  const uniquePatientRows = Array.from(currentPatientRows.reduce((patientsById, patient) => {
    const existingPatient = patientsById.get(patient.id);
    if (!existingPatient || !existingPatient.assignedNurseId && patient.assignedNurseId) {
      patientsById.set(patient.id, patient);
    }
    return patientsById;
  }, new Map<string, ScopedPatientRow>()).values());
  const scheduleSummary = await getMedicationScheduleSummaryForPatients(uniquePatientRows.map((patient) => patient.id));
  const assignedPatientIdsByNurse = new Map<string, Set<string>>();
  currentPatientRows.forEach((patient) => {
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
          isActive: medicationSchedules.isActive,
        })
        .from(medicationSchedules)
        .where(inArray(medicationSchedules.patientId, allUniqueIds))
    : [];
  const schedulesByPatientId = new Map<string, Array<{ stock: number | null; isActive: boolean | null }>>();
  for (const s of activeSchedules) {
    const patientSchedules = schedulesByPatientId.get(s.patientId) ?? [];
    patientSchedules.push({ stock: s.stock, isActive: s.isActive });
    schedulesByPatientId.set(s.patientId, patientSchedules);
  }

  const patientInsights = await Promise.all(uniquePatientRows.map(async (patient) => {
    const adherence = await getAdherenceStats({ patientId: patient.id, period: "all" }, user).catch(() => null);
    const adherenceRate = Math.round(adherence?.adherenceRate ?? 100);
    const totalScheduled = adherence?.totalScheduled ?? 0;
    const patientSchedules = schedulesByPatientId.get(patient.id) ?? [];
    const isMedicationComplete = patientSchedules.length > 0
      && patientSchedules.every((schedule) => schedule.isActive === false || (schedule.stock ?? 0) <= 0);
    const status = patient.isActive === false ? "Nonaktif" : getFinalPatientStatus(adherenceRate, totalScheduled, isMedicationComplete);

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
    .filter((patient) => patient.status === "Lagging Behind" || patient.status === "Need Special Attention")
    .sort((first, second) => first.adherence - second.adherence);

  const actionablePatientIdsByNurse = new Map<string, Set<string>>();
  patientInsights.forEach((patient) => {
    if (!patient.assignedNurseId || patient.status === "Complete" || patient.status === "Nonaktif") return;
    const patientIds = actionablePatientIdsByNurse.get(patient.assignedNurseId) ?? new Set<string>();
    patientIds.add(patient.id);
    actionablePatientIdsByNurse.set(patient.assignedNurseId, patientIds);
  });

  const riskyPatientIds = new Set(riskyPatients.map((patient) => patient.id));
  const riskyPatientCount = new Map<string, number>();
  currentPatientRows.forEach((patient) => {
    if (!patient.assignedNurseId || !riskyPatientIds.has(patient.id)) return;
    riskyPatientCount.set(patient.assignedNurseId, (riskyPatientCount.get(patient.assignedNurseId) || 0) + 1);
  });

  const inactiveNurseReassignPatientIdsByNurse = await getInactiveNurseReassignData(nurseRows, user);
  inactiveNurseReassignPatientIdsByNurse.forEach((patientIds, nurseId) => {
    actionablePatientIdsByNurse.set(nurseId, patientIds);
  });

  const nurseFollowUps = buildNurseFollowUps(nurseRows, actionablePatientIdsByNurse, riskyPatientCount);
  const inactiveNurseReassignCount = inactiveNurseReassignPatientIdsByNurse.size;

  const priorityActivities = await listPriorityNotifications(user, currentPatientRows);

  return {
    summary: {
      totalNurses: nurseRows.length,
      totalPatients,
      totalActiveSchedules: scheduleSummary.active,
      inactiveNurseReassignCount,
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

  const notificationConditions: SQL[] = [
    inArray(notifications.urgency, ["high", "urgent", "critical"]),
    eq(notifications.status, "delivered")
  ];

  if (scope.patientIds !== null) {
    if (scope.patientIds.length === 0) {
      return {
        totalActivePatients: 0,
        warningCriticalNotifications: 0,
        overallAdherence: 0,
      };
    }
    notificationConditions.push(inArray(notifications.patientId, scope.patientIds));
  }
  
  if (user) {
    // Only count UNREAD warning/critical notifications
    notificationConditions.push(
      sql`not exists (select 1 from ${activityReads} where ${activityReads.userId} = ${user.id} and ${activityReads.activityId} = ('notification-' || ${notifications.id}::text))`
    );
  }

  const firstPatientPage = await listPatients({ page: "1", limit: "100", status: "all" }, user);
  const remainingPatientPages = await Promise.all(
    Array.from({ length: Math.max(Math.ceil(firstPatientPage.meta.total / firstPatientPage.meta.limit) - 1, 0) }, (_, index) => (
      listPatients({ page: String(index + 2), limit: String(firstPatientPage.meta.limit), status: "all" }, user)
    )),
  );
  const patientRows = [firstPatientPage, ...remainingPatientPages].flatMap((page) => page.data);

  const notificationRows = await db
    .select({ total: count() })
    .from(notifications)
    .where(and(...notificationConditions));

  const patientAdherenceRates = patientRows.map((patient) => (
    patient.totalScheduledAll ? Math.round(patient.adherenceRateAll ?? 0) : 100
  ));
  const overallAdherence = patientAdherenceRates.length > 0
    ? Math.round(patientAdherenceRates.reduce((sum, adherenceRate) => sum + adherenceRate, 0) / patientAdherenceRates.length)
    : 0;

  return {
    totalActivePatients: firstPatientPage.meta.total,
    warningCriticalNotifications: Number(notificationRows[0]?.total || 0),
    overallAdherence,
  };
};
