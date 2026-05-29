import { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateFoodDetect, validateFoodUpload, validateInteractionCheck, validateNutrition } from "../../src/validators/food-ai.validator";
import { validateNurseCreate, validateNurseId, validateNurseUpdate } from "../../src/validators/nurse.validator";
import { validatePreference, validateSendNotification, validateSubscribe, validateTrackNotificationEvent, validateUserNotificationPreference, validateUserSubscribe } from "../../src/validators/notification.validator";
import { validatePrescriptionCreate, validatePrescriptionId, validatePrescriptionUpdate } from "../../src/validators/prescription.validator";

const validUuid = "11111111-1111-4111-8111-111111111111";
const subscription = { endpoint: "https://push.example.test/subscription", keys: { p256dh: "p256dh", auth: "auth" } };

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
}) as unknown as Response;

const createRequest = (body: Record<string, unknown> = {}, params: Record<string, string> = {}, file?: unknown) => ({
  body,
  params,
  file,
}) as Request;

const expectAccepted = (res: Response, next: NextFunction) => {
  expect(res.status).not.toHaveBeenCalled();
  expect(next).toHaveBeenCalledOnce();
};

const expectRejected = (res: Response, next: NextFunction) => {
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error_code: "VALIDATION_ERROR" }));
  expect(next).not.toHaveBeenCalled();
};

describe("extended validators", () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it("validates nurse IDs", () => {
    const req = createRequest({}, { id: validUuid });
    const res = createResponse();

    validateNurseId(req, res, next);

    expectAccepted(res, next);
  });

  it("accepts valid nurse creation payloads", () => {
    const req = createRequest({ fullName: "Nurse One", email: "nurse@jivara.test", password: "password123", gender: "male", age: 28, organizationId: validUuid });
    const res = createResponse();

    validateNurseCreate(req, res, next);

    expectAccepted(res, next);
  });

  it("rejects invalid nurse update flags", () => {
    const req = createRequest({ isActive: "true" });
    const res = createResponse();

    validateNurseUpdate(req, res, next);

    expectRejected(res, next);
  });

  it("normalizes prescription creation payloads", () => {
    const req = createRequest({ patient_id: validUuid, start_date: "2026-05-15", end_date: "2026-06-15" });
    const res = createResponse();

    validatePrescriptionCreate(req, res, next);

    expect(req.body.patientId).toBe(validUuid);
    expect(req.body.startDate).toBe("2026-05-15");
    expectAccepted(res, next);
  });

  it("validates prescription IDs", () => {
    const req = createRequest({}, { id: validUuid });
    const res = createResponse();

    validatePrescriptionId(req, res, next);

    expectAccepted(res, next);
  });

  it("rejects invalid prescription update dates", () => {
    const req = createRequest({ startDate: "not-a-date" });
    const res = createResponse();

    validatePrescriptionUpdate(req, res, next);

    expectRejected(res, next);
  });

  it("accepts food uploads with imageUrl", () => {
    const req = createRequest({ patient_id: validUuid, imageUrl: "/uploads/food-scans/food.jpg" });
    const res = createResponse();

    validateFoodUpload(req, res, next);

    expect(req.body.patientId).toBe(validUuid);
    expectAccepted(res, next);
  });

  it("rejects food upload imageUrl outside Jivara storage", () => {
    const req = createRequest({ patient_id: validUuid, imageUrl: "http://169.254.169.254/latest/meta-data" });
    const res = createResponse();

    validateFoodUpload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error_code: "INVALID_IMAGE_URL" }));
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects food uploads without image input", () => {
    const req = createRequest({ patientId: validUuid });
    const res = createResponse();

    validateFoodUpload(req, res, next);

    expectRejected(res, next);
  });

  it("normalizes food detection payloads", () => {
    const req = createRequest({ patient_id: validUuid, image_id: validUuid });
    const res = createResponse();

    validateFoodDetect(req, res, next);

    expect(req.body.patientId).toBe(validUuid);
    expect(req.body.imageId).toBe(validUuid);
    expectAccepted(res, next);
  });

  it("normalizes interaction check payloads", () => {
    const detectedItems = [{ label: "nasi" }];
    const req = createRequest({ patient_id: validUuid, scan_id: validUuid, detected_items: detectedItems });
    const res = createResponse();

    validateInteractionCheck(req, res, next);

    expect(req.body.patientId).toBe(validUuid);
    expect(req.body.scanId).toBe(validUuid);
    expect(req.body.detectedItems).toBe(detectedItems);
    expectAccepted(res, next);
  });

  it("rejects empty nutrition detected items", () => {
    const req = createRequest({ detectedItems: [] });
    const res = createResponse();

    validateNutrition(req, res, next);

    expectRejected(res, next);
  });

  it("normalizes patient push subscriptions", () => {
    const req = createRequest({ patient_id: validUuid, subscription });
    const res = createResponse();

    validateSubscribe(req, res, next);

    expect(req.body.patientId).toBe(validUuid);
    expect(req.body.endpoint).toBe(subscription.endpoint);
    expectAccepted(res, next);
  });

  it("rejects non-HTTPS user push subscriptions", () => {
    const req = createRequest({ subscription: { ...subscription, endpoint: "http://push.example.test/subscription" } });
    const res = createResponse();

    validateUserSubscribe(req, res, next);

    expectRejected(res, next);
  });

  it("accepts patient notification preferences", () => {
    const req = createRequest({ patientId: validUuid, enabled: true });
    const res = createResponse();

    validatePreference(req, res, next);

    expectAccepted(res, next);
  });

  it("normalizes user notification preference keys", () => {
    const req = createRequest({ preference_key: "nurse_critical_alert", enabled: false });
    const res = createResponse();

    validateUserNotificationPreference(req, res, next);

    expect(req.body.key).toBe("nurse_critical_alert");
    expectAccepted(res, next);
  });

  it("trims valid send notification payloads", () => {
    const req = createRequest({ patient_id: validUuid, type: "medication_reminder", title: " Reminder ", body: " Minum obat ", urgency: "high" });
    const res = createResponse();

    validateSendNotification(req, res, next);

    expect(req.body.patientId).toBe(validUuid);
    expect(req.body.title).toBe("Reminder");
    expect(req.body.body).toBe("Minum obat");
    expect(req.body.type).toBe("medication_reminder");
    expectAccepted(res, next);
  });

  it("normalizes notification tracking events", () => {
    const req = createRequest({ notification_id: validUuid, event_type: "clicked" });
    const res = createResponse();

    validateTrackNotificationEvent(req, res, next);

    expect(req.body.notificationId).toBe(validUuid);
    expect(req.body.eventType).toBe("clicked");
    expectAccepted(res, next);
  });
});
