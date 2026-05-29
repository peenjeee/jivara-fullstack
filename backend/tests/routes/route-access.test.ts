import express, { NextFunction, Request, Response } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

type TestUserRequest = Request & { user?: { id: string; email: string; role: string } };

const { pass, controllers, validators } = vi.hoisted(() => {
  const ok = (req: Request, res: Response) => res.status(req.method === "POST" ? 201 : 200).json({ status: "berhasil" });
  const pass = (_req: Request, _res: Response, next: NextFunction) => next();

  return {
    pass,
    controllers: {
      listPatients: ok,
      getPatient: ok,
      getCurrentPatient: ok,
      createPatient: ok,
      updatePatient: ok,
      assignPatient: ok,
      deactivatePatient: ok,
      listNurses: ok,
      getNurse: ok,
      createNurse: ok,
      updateNurse: ok,
      deactivateNurse: ok,
      listMedicationSchedules: ok,
      getMedicationSchedule: ok,
      createMedicationSchedule: ok,
      createMedicationSchedules: ok,
      updateMedicationSchedule: ok,
      deactivateMedicationSchedule: ok,
      listMedicationSchedulePatientGroups: ok,
      listMedicationLogs: ok,
      snoozeMedicationReminder: ok,
      createMedicationLog: ok,
      listPrescriptions: ok,
      getPrescription: ok,
      createPrescription: ok,
      updatePrescription: ok,
      deletePrescription: ok,
      listFoodScans: ok,
      getFoodScan: ok,
      uploadFoodImage: ok,
      detectFood: ok,
      checkInteraction: ok,
      estimateNutrition: ok,
      recommendFoods: ok,
      getPublicKey: ok,
      trackEvent: ok,
      listNotifications: ok,
      getAnalytics: ok,
      getPreference: ok,
      getUserPreference: ok,
      updateUserPreference: ok,
      subscribe: ok,
      subscribeUser: ok,
      updatePreference: ok,
      sendNotification: ok,
      listAlerts: ok,
      resolveAlert: ok,
      listAuditLogs: ok,
    },
    validators: {
      validatePatientCreate: pass,
      validatePatientUpdate: pass,
      validateAssignPatient: pass,
      validateNurseCreate: pass,
      validateNurseId: pass,
      validateNurseUpdate: pass,
      validateMedicationScheduleCreate: pass,
      validateMedicationScheduleBulkCreate: pass,
      validateMedicationScheduleId: pass,
      validateMedicationScheduleUpdate: pass,
      validateMedicationLogCreate: pass,
      validateMedicationSnooze: pass,
      validatePrescriptionCreate: pass,
      validatePrescriptionId: pass,
      validatePrescriptionUpdate: pass,
      validateFoodDetect: pass,
      validateFoodUpload: pass,
      validateInteractionCheck: pass,
      validateNutrition: pass,
      validateFoodRecommendations: pass,
      validatePreference: pass,
      validateSendNotification: pass,
      validateSubscribe: pass,
      validateTrackNotificationEvent: pass,
      validateUserNotificationPreference: pass,
      validateUserSubscribe: pass,
    },
  };
});

vi.mock("../../src/middleware/auth.middleware", () => ({
  authenticateToken: (req: TestUserRequest, res: Response, next: NextFunction) => {
    const role = req.headers["x-test-role"];

    if (!role) {
      return res.status(401).json({ status: "gagal", error_code: "MISSING_TOKEN" });
    }

    req.user = {
      id: "test-user-id",
      email: "test@jivara.test",
      role: String(role),
    };
    next();
  },
  authorizeRoles: (...roles: string[]) => (req: TestUserRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role === "superadmin" ? "super_admin" : req.user?.role;

    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        status: "gagal",
        message: "Anda tidak memiliki izin untuk mengakses sumber daya ini",
        error_code: "FORBIDDEN",
      });
    }

    next();
  },
}));

vi.mock("../../src/middleware/upload.middleware", () => ({ uploadSingleFoodImage: pass }));

vi.mock("../../src/controllers/patient.controller", () => controllers);
vi.mock("../../src/controllers/nurse.controller", () => controllers);
vi.mock("../../src/controllers/medication-schedule.controller", () => controllers);
vi.mock("../../src/controllers/medication-log.controller", () => controllers);
vi.mock("../../src/controllers/prescription.controller", () => controllers);
vi.mock("../../src/controllers/food-ai.controller", () => controllers);
vi.mock("../../src/controllers/notification.controller", () => controllers);
vi.mock("../../src/controllers/alert.controller", () => controllers);
vi.mock("../../src/controllers/audit-log.controller", () => controllers);

vi.mock("../../src/validators/patient.validator", () => validators);
vi.mock("../../src/validators/nurse.validator", () => validators);
vi.mock("../../src/validators/medication-schedule.validator", () => validators);
vi.mock("../../src/validators/medication-log.validator", () => validators);
vi.mock("../../src/validators/prescription.validator", () => validators);
vi.mock("../../src/validators/food-ai.validator", () => validators);
vi.mock("../../src/validators/notification.validator", () => validators);

describe("route access control", async () => {
  const [
    patientRoutes,
    nurseRoutes,
    medicationScheduleRoutes,
    medicationLogRoutes,
    prescriptionRoutes,
    foodAiRoutes,
    notificationRoutes,
    alertRoutes,
    auditLogRoutes,
  ] = await Promise.all([
    import("../../src/routes/patient.routes"),
    import("../../src/routes/nurse.routes"),
    import("../../src/routes/medication-schedule.routes"),
    import("../../src/routes/medication-log.routes"),
    import("../../src/routes/prescription.routes"),
    import("../../src/routes/food-ai.routes"),
    import("../../src/routes/notification.routes"),
    import("../../src/routes/alert.routes"),
    import("../../src/routes/audit-log.routes"),
  ]);

  const app = express()
    .use(express.json())
    .use("/patients", patientRoutes.default)
    .use("/nurses", nurseRoutes.default)
    .use("/medication-schedules", medicationScheduleRoutes.default)
    .use("/medication-logs", medicationLogRoutes.default)
    .use("/prescriptions", prescriptionRoutes.default)
    .use("/food", foodAiRoutes.default)
    .use("/notifications", notificationRoutes.default)
    .use("/alerts", alertRoutes.default)
    .use("/audit-logs", auditLogRoutes.default);

  const validUuid = "11111111-1111-4111-8111-111111111111";

  const allowedCases = [
    ["patient reads patients", "get", "/patients", "patient"],
    ["patient reads own schedules", "get", "/medication-schedules", "patient"],
    ["patient creates medication log", "post", "/medication-logs", "patient"],
    ["patient snoozes medication reminder", "post", "/medication-logs/snooze", "patient"],
    ["patient uploads food scan", "post", "/food/food-scans", "patient"],
    ["patient tracks notification event", "post", "/notifications/events", "patient"],
    ["patient reads notification preference", "get", "/notifications/preferences", "patient"],
    ["nurse creates patient", "post", "/patients", "nurse"],
    ["nurse creates schedule", "post", "/medication-schedules", "nurse"],
    ["nurse reads prescriptions", "get", "/prescriptions", "nurse"],
    ["nurse reads alerts", "get", "/alerts", "nurse"],
    ["nurse reads own audit logs", "get", "/audit-logs", "nurse"],
    ["admin manages nurses", "get", "/nurses", "admin"],
    ["admin reads audit logs", "get", "/audit-logs", "admin"],
    ["super admin assigns patients", "put", `/patients/${validUuid}/assign`, "super_admin"],
  ] as const;

  it.each(allowedCases)("allows %s", async (_label, method, path, role) => {
    await request(app)[method](path).set("x-test-role", role).expect((response) => {
      expect([200, 201]).toContain(response.status);
    });
  });

  const forbiddenCases = [
    ["anonymous request", "get", "/patients", undefined, 401],
    ["anonymous notification event", "post", "/notifications/events", undefined, 401],
    ["patient creating patients", "post", "/patients", "patient", 403],
    ["patient managing nurses", "get", "/nurses", "patient", 403],
    ["patient reading prescriptions", "get", "/prescriptions", "patient", 403],
    ["patient reading audit logs", "get", "/audit-logs", "patient", 403],
    ["nurse reading user notification preferences", "get", "/notifications/user-preferences", "patient", 403],
    ["nurse assigning patients", "put", `/patients/${validUuid}/assign`, "nurse", 403],
  ] as const;

  it.each(forbiddenCases)("blocks %s", async (_label, method, path, role, status) => {
    const testRequest = request(app)[method](path);
    if (role) testRequest.set("x-test-role", role);

    await testRequest.expect(status);
  });
});
