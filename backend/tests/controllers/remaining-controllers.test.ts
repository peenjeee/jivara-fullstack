import { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRequest } from "../../src/middleware/auth.middleware";

const services = vi.hoisted(() => ({
  nurse: { listNurses: vi.fn(), getNurseById: vi.fn(), createNurse: vi.fn(), updateNurse: vi.fn(), deactivateNurse: vi.fn() },
  schedule: { listMedicationSchedules: vi.fn(), getMedicationScheduleById: vi.fn(), createMedicationSchedule: vi.fn(), updateMedicationSchedule: vi.fn(), deactivateMedicationSchedule: vi.fn() },
  prescription: { listPrescriptions: vi.fn(), getPrescriptionById: vi.fn(), createPrescription: vi.fn(), updatePrescription: vi.fn(), deletePrescription: vi.fn() },
  alert: { listAlerts: vi.fn(), resolveAlert: vi.fn() },
  audit: { listAuditLogs: vi.fn() },
  adherence: { getAdherenceStats: vi.fn(), getAggregateAdherenceStats: vi.fn() },
  publicStats: { getPublicStats: vi.fn() },
  food: { listFoodScans: vi.fn(), getFoodScanById: vi.fn(), uploadFoodImage: vi.fn(), detectFood: vi.fn(), checkInteraction: vi.fn(), estimateNutrition: vi.fn() },
  storage: { uploadFoodScanImage: vi.fn(), deleteLocalUploadIfExists: vi.fn() },
  notification: {
    subscribeDevice: vi.fn(), subscribeUserDevice: vi.fn(), setNotificationPreference: vi.fn(), getNotificationPreference: vi.fn(),
    getUserNotificationPreference: vi.fn(), setUserNotificationPreference: vi.fn(), listNotifications: vi.fn(), trackNotificationEvent: vi.fn(),
    getNotificationAnalytics: vi.fn(), getVapidPublicKey: vi.fn(), sendPushNotification: vi.fn(),
  },
  auth: {
    registerUser: vi.fn(), loginUser: vi.fn(), listPendingAdminApprovals: vi.fn(), getAdminApprovalSummary: vi.fn(), approveAdminApproval: vi.fn(),
    rejectAdminApproval: vi.fn(), activateSuspendedAdmin: vi.fn(), restoreRejectedAdmin: vi.fn(), suspendActiveAdmin: vi.fn(), completePasswordChange: vi.fn(),
    changePassword: vi.fn(), refreshAccessToken: vi.fn(), getUserProfileByRefreshToken: vi.fn(), invalidateRefreshToken: vi.fn(), getUserProfile: vi.fn(), updateUserProfile: vi.fn(),
    listPendingRegistrations: vi.fn(), approveRegistration: vi.fn(), rejectRegistration: vi.fn(),
  },
}));

vi.mock("../../src/services/nurse.service", () => services.nurse);
vi.mock("../../src/services/medication-schedule.service", () => services.schedule);
vi.mock("../../src/services/prescription.service", () => services.prescription);
vi.mock("../../src/services/alert.service", () => services.alert);
vi.mock("../../src/services/audit-log.service", () => services.audit);
vi.mock("../../src/services/adherence.service", () => services.adherence);
vi.mock("../../src/services/public-stats.service", () => services.publicStats);
vi.mock("../../src/services/food-ai.service", () => services.food);
vi.mock("../../src/services/storage.service", () => services.storage);
vi.mock("../../src/services/notification.service", () => services.notification);
vi.mock("../../src/services/auth.service", () => services.auth);

const user = { id: "user-id", email: "user@jivara.test", role: "admin" };

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
}) as unknown as Response;

const authReq = (overrides: Partial<AuthRequest> = {}) => ({
  query: {},
  params: {},
  body: {},
  headers: {},
  user,
  ...overrides,
}) as AuthRequest;

describe("remaining controllers without database", async () => {
  const nurseController = await import("../../src/controllers/nurse.controller");
  const scheduleController = await import("../../src/controllers/medication-schedule.controller");
  const prescriptionController = await import("../../src/controllers/prescription.controller");
  const alertController = await import("../../src/controllers/alert.controller");
  const auditController = await import("../../src/controllers/audit-log.controller");
  const adherenceController = await import("../../src/controllers/adherence.controller");
  const publicStatsController = await import("../../src/controllers/public-stats.controller");
  const foodController = await import("../../src/controllers/food-ai.controller");
  const notificationController = await import("../../src/controllers/notification.controller");
  const authController = await import("../../src/controllers/auth.controller");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("covers nurse controller success and error responses", async () => {
    services.nurse.listNurses.mockResolvedValue({ data: [{ id: "nurse-id" }], meta: { total: 1 } });
    services.nurse.createNurse.mockResolvedValue({ id: "nurse-id" });
    services.nurse.getNurseById.mockRejectedValue({ status: 404, message: "Perawat tidak ditemukan", code: "NURSE_NOT_FOUND" });
    const res = createResponse();

    await nurseController.listNurses(authReq(), res);
    expect(res.json).toHaveBeenLastCalledWith({ status: "berhasil", data: [{ id: "nurse-id" }], meta: { total: 1 } });

    await nurseController.createNurse(authReq({ body: { fullName: "Nurse" } }), res);
    expect(res.status).toHaveBeenLastCalledWith(201);

    await nurseController.getNurse(authReq({ params: { id: "missing" } }), res);
    expect(res.json).toHaveBeenLastCalledWith({ status: "gagal", message: "Perawat tidak ditemukan", error_code: "NURSE_NOT_FOUND" });
  });

  it("covers medication schedule controller success paths", async () => {
    services.schedule.listMedicationSchedules.mockResolvedValue([{ id: "schedule-id" }]);
    services.schedule.createMedicationSchedule.mockResolvedValue({ id: "schedule-id" });
    services.schedule.deactivateMedicationSchedule.mockResolvedValue(undefined);
    const res = createResponse();

    await scheduleController.listMedicationSchedules(authReq(), res);
    await scheduleController.createMedicationSchedule(authReq({ body: { drugName: "Obat" } }), res);
    await scheduleController.deactivateMedicationSchedule(authReq({ params: { id: "schedule-id" } }), res);

    expect(res.json).toHaveBeenCalledWith({ status: "berhasil", data: [{ id: "schedule-id" }] });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Jadwal obat berhasil dibuat" }));
    expect(res.json).toHaveBeenCalledWith({ status: "berhasil", message: "Jadwal obat berhasil dinonaktifkan" });
  });

  it("covers prescription controller success paths", async () => {
    services.prescription.listPrescriptions.mockResolvedValue([{ id: "rx-id" }]);
    services.prescription.createPrescription.mockResolvedValue({ id: "rx-id" });
    services.prescription.deletePrescription.mockResolvedValue(undefined);
    const res = createResponse();

    await prescriptionController.listPrescriptions(authReq(), res);
    await prescriptionController.createPrescription(authReq({ body: { patientId: "patient-id" } }), res);
    await prescriptionController.deletePrescription(authReq({ params: { id: "rx-id" } }), res);

    expect(res.json).toHaveBeenCalledWith({ status: "berhasil", data: [{ id: "rx-id" }] });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Resep berhasil dibuat" }));
    expect(res.json).toHaveBeenCalledWith({ status: "berhasil", message: "Resep berhasil dihapus" });
  });

  it("covers alert, audit, adherence, and public stats controllers", async () => {
    services.alert.listAlerts.mockResolvedValue({ data: [{ id: "alert-id" }], meta: { total: 1 } });
    services.alert.resolveAlert.mockResolvedValue({ id: "alert-id" });
    services.audit.listAuditLogs.mockResolvedValue({ data: [{ id: "audit-id" }], meta: { total: 1 } });
    services.adherence.getAdherenceStats.mockResolvedValue({ adherenceRate: 90 });
    services.adherence.getAggregateAdherenceStats.mockResolvedValue({ averageAdherenceRate: 80 });
    services.publicStats.getPublicStats.mockResolvedValue({ patients: 10 });
    const res = createResponse();

    await alertController.listAlerts(authReq(), res);
    await alertController.resolveAlert(authReq({ params: { id: "alert-id" } }), res);
    await auditController.listAuditLogs(authReq(), res);
    await adherenceController.getAdherence(authReq(), res);
    await adherenceController.getAggregateAdherence(authReq(), res);
    await publicStatsController.getPublicStats({} as Request, res);

    expect(res.json).toHaveBeenCalledWith({ status: "berhasil", data: [{ id: "alert-id" }], meta: { total: 1 } });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Alert berhasil diselesaikan" }));
    expect(res.json).toHaveBeenCalledWith({ status: "berhasil", data: { patients: 10 } });
  });

  it("covers food AI controller success and upload cleanup on error", async () => {
    services.food.listFoodScans.mockResolvedValue({ data: [{ id: "scan-id" }], meta: { page: 1, limit: 20, total: 1 } });
    services.food.detectFood.mockResolvedValue({ detectedItems: [] });
    services.storage.uploadFoodScanImage.mockResolvedValue("/uploads/food.jpg");
    services.food.uploadFoodImage.mockRejectedValue({ status: 502, message: "AI gagal", code: "AI_FAILED" });
    const res = createResponse();

    await foodController.listFoodScans(authReq(), res);
    await foodController.detectFood(authReq({ body: { scanId: "scan-id" } }), res);
    await foodController.uploadFoodImage(authReq({ body: { patientId: "patient-id" }, file: { path: "/tmp/food.jpg", size: 1000, originalname: "food.jpg", mimetype: "image/jpeg" } as Express.Multer.File }), res);

    expect(res.json).toHaveBeenCalledWith({ status: "berhasil", data: [{ id: "scan-id" }], meta: { page: 1, limit: 20, total: 1 } });
    expect(services.storage.deleteLocalUploadIfExists).toHaveBeenCalledWith("/tmp/food.jpg");
    expect(res.json).toHaveBeenLastCalledWith({ status: "gagal", message: "Terjadi kesalahan pada server", error_code: "AI_FAILED" });
  });

  it("covers notification controller public, list, preference, and send actions", async () => {
    services.notification.getVapidPublicKey.mockReturnValue({ publicKey: "key" });
    services.notification.listNotifications.mockResolvedValue({ data: [{ id: "notif-id" }], meta: { total: 1 } });
    services.notification.setNotificationPreference.mockResolvedValue({ enabled: true });
    services.notification.sendPushNotification.mockResolvedValue({ sent: true });
    const res = createResponse();

    await notificationController.getPublicKey(authReq(), res);
    await notificationController.listNotifications(authReq(), res);
    await notificationController.updatePreference(authReq({ body: { patientId: "patient-id", enabled: true } }), res);
    await notificationController.sendNotification(authReq({ body: { title: "Hi" } }), res);

    expect(res.json).toHaveBeenCalledWith({ status: "berhasil", data: { publicKey: "key" } });
    expect(res.json).toHaveBeenCalledWith({ status: "berhasil", data: [{ id: "notif-id" }], meta: { total: 1 } });
    expect(res.json).toHaveBeenCalledWith({ status: "berhasil", data: { sent: true }, message: "Push notification diproses" });
  });

  it("covers auth controller core success and validation paths", async () => {
    services.auth.registerUser.mockResolvedValue({ id: "user-id", fullName: "Admin", role: "admin", createdAt: "now" });
    services.auth.loginUser.mockResolvedValue({ access_token: "token" });
    services.auth.listPendingAdminApprovals.mockResolvedValue([{ id: "pending-id" }]);
    services.auth.getAdminApprovalSummary.mockResolvedValue({ pending: 1 });
    services.auth.refreshAccessToken.mockResolvedValue({ access_token: "new-token" });
    services.auth.getUserProfile.mockResolvedValue({ id: "user-id" });
    const res = createResponse();

    await authController.register(authReq({ body: { email: "admin@jivara.test" } }), res);
    await authController.login(authReq({ body: { identifier: "admin@jivara.test" } }), res);
    await authController.listAdminApprovals(authReq(), res);
    await authController.refresh(authReq({ body: {} }), res);
    await authController.refresh(authReq({ body: { refresh_token: "refresh-token" } }), res);
    await authController.getMe(authReq(), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ status: "berhasil", data: { access_token: "token" } });
    expect(res.json).toHaveBeenCalledWith({ status: "gagal", message: "Token refresh wajib diisi", error_code: "VALIDATION_ERROR" });
    expect(res.json).toHaveBeenCalledWith({ status: "berhasil", data: { access_token: "new-token" } });
    expect(res.json).toHaveBeenCalledWith({ status: "berhasil", data: { id: "user-id" } });
  });
});
