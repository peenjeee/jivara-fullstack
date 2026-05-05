import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as prescriptionService from "../services/prescription.service";

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

export const listPrescriptions = async (req: AuthRequest, res: Response) => {
  try {
    const data = await prescriptionService.listPrescriptions(req.query, req.user);
    res.status(200).json({ status: "berhasil", data });
  } catch (error) {
    sendError(res, error);
  }
};

export const getPrescription = async (req: AuthRequest, res: Response) => {
  try {
    const data = await prescriptionService.getPrescriptionById(getParam(req.params.id), req.user);
    res.status(200).json({ status: "berhasil", data });
  } catch (error) {
    sendError(res, error);
  }
};

export const createPrescription = async (req: AuthRequest, res: Response) => {
  try {
    const data = await prescriptionService.createPrescription(req.body, req.user?.id, req.user);
    res.status(201).json({ status: "berhasil", data, message: "Resep berhasil dibuat" });
  } catch (error) {
    sendError(res, error);
  }
};

export const updatePrescription = async (req: AuthRequest, res: Response) => {
  try {
    const data = await prescriptionService.updatePrescription(getParam(req.params.id), req.body, req.user);
    res.status(200).json({ status: "berhasil", data, message: "Resep berhasil diperbarui" });
  } catch (error) {
    sendError(res, error);
  }
};

export const deletePrescription = async (req: AuthRequest, res: Response) => {
  try {
    await prescriptionService.deletePrescription(getParam(req.params.id), req.user);
    res.status(200).json({ status: "berhasil", message: "Resep berhasil dihapus" });
  } catch (error) {
    sendError(res, error);
  }
};
