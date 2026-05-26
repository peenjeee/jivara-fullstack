import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as medicationScheduleService from "../services/medication-schedule.service";

const sendError = (res: Response, error: unknown) => {
  const err = error as { status?: number; message?: string; code?: string };
  const status = err.status || 500;

  return res.status(status).json({
    status: "gagal",
    message: status >= 500 ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
    ...(err.code && { error_code: err.code }),
  });
};

const getParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value || "";

export const listMedicationSchedules = async (req: AuthRequest, res: Response) => {
  try {
    const schedules = await medicationScheduleService.listMedicationSchedules(req.query, req.user);
    res.status(200).json({ status: "berhasil", data: schedules });
  } catch (error) {
    sendError(res, error);
  }
};

export const listMedicationSchedulePatientGroups = async (req: AuthRequest, res: Response) => {
  try {
    const result = await medicationScheduleService.listMedicationSchedulePatientGroups(req.query, req.user);
    res.status(200).json({ status: "berhasil", data: { patients: result.patients, schedules: result.schedules }, meta: result.meta });
  } catch (error) {
    sendError(res, error);
  }
};

export const getMedicationSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const schedule = await medicationScheduleService.getMedicationScheduleById(getParam(req.params.id), req.user);
    res.status(200).json({ status: "berhasil", data: schedule });
  } catch (error) {
    sendError(res, error);
  }
};

export const createMedicationSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const schedule = await medicationScheduleService.createMedicationSchedule(req.body, req.user?.id, req.user);
    res.status(201).json({
      status: "berhasil",
      data: schedule,
      message: "Jadwal obat berhasil dibuat",
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const createMedicationSchedules = async (req: AuthRequest, res: Response) => {
  try {
    const schedules = await medicationScheduleService.createMedicationSchedules(req.body.schedules, req.user?.id, req.user);
    res.status(201).json({
      status: "berhasil",
      data: schedules,
      message: "Jadwal obat berhasil dibuat",
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateMedicationSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const schedule = await medicationScheduleService.updateMedicationSchedule(getParam(req.params.id), req.body, req.user);
    res.status(200).json({
      status: "berhasil",
      data: schedule,
      message: "Jadwal obat berhasil diperbarui",
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const deactivateMedicationSchedule = async (req: AuthRequest, res: Response) => {
  try {
    await medicationScheduleService.deactivateMedicationSchedule(getParam(req.params.id), req.user);
    res.status(200).json({ status: "berhasil", message: "Jadwal obat berhasil dinonaktifkan" });
  } catch (error) {
    sendError(res, error);
  }
};
