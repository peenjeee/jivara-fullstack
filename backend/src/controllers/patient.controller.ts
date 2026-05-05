import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as patientService from "../services/patient.service";

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

export const listPatients = async (req: AuthRequest, res: Response) => {
  try {
    const result = await patientService.listPatients(req.query, req.user);
    res.status(200).json({ status: "berhasil", data: result.data, meta: result.meta });
  } catch (error) {
    sendError(res, error);
  }
};

export const getPatient = async (req: AuthRequest, res: Response) => {
  try {
    const patient = await patientService.getPatientById(getParam(req.params.id), req.user);
    res.status(200).json({ status: "berhasil", data: patient });
  } catch (error) {
    sendError(res, error);
  }
};

export const createPatient = async (req: AuthRequest, res: Response) => {
  try {
    const patient = await patientService.createPatient(req.body, req.user?.id);
    res.status(201).json({
      status: "berhasil",
      data: patient,
      message: "Pasien berhasil didaftarkan",
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const updatePatient = async (req: AuthRequest, res: Response) => {
  try {
    const patient = await patientService.updatePatient(getParam(req.params.id), req.body, req.user);
    res.status(200).json({ status: "berhasil", data: patient, message: "Data pasien berhasil diperbarui" });
  } catch (error) {
    sendError(res, error);
  }
};

export const assignPatient = async (req: AuthRequest, res: Response) => {
  try {
    const patient = await patientService.assignPatient(getParam(req.params.id), req.body.nurseId, req.user?.id);
    res.status(200).json({ status: "berhasil", data: patient, message: "Pasien berhasil ditugaskan ke perawat" });
  } catch (error) {
    sendError(res, error);
  }
};

export const deactivatePatient = async (req: AuthRequest, res: Response) => {
  try {
    await patientService.deactivatePatient(getParam(req.params.id));
    res.status(200).json({ status: "berhasil", message: "Pasien berhasil dinonaktifkan" });
  } catch (error) {
    sendError(res, error);
  }
};
