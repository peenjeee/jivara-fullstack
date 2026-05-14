import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as nurseService from "../services/nurse.service";

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

export const listNurses = async (req: AuthRequest, res: Response) => {
  try {
    const result = await nurseService.listNurses(req.query, req.user);
    res.status(200).json({ status: "berhasil", data: result.data, meta: result.meta });
  } catch (error) {
    sendError(res, error);
  }
};

export const getNurse = async (req: AuthRequest, res: Response) => {
  try {
    const data = await nurseService.getNurseById(getParam(req.params.id), req.user);
    res.status(200).json({ status: "berhasil", data });
  } catch (error) {
    sendError(res, error);
  }
};

export const createNurse = async (req: AuthRequest, res: Response) => {
  try {
    const data = await nurseService.createNurse(req.body, req.user);
    res.status(201).json({ status: "berhasil", data, message: "Akun perawat berhasil dibuat" });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateNurse = async (req: AuthRequest, res: Response) => {
  try {
    const data = await nurseService.updateNurse(getParam(req.params.id), req.body, req.user);
    res.status(200).json({ status: "berhasil", data, message: "Data perawat berhasil diperbarui" });
  } catch (error) {
    sendError(res, error);
  }
};

export const deactivateNurse = async (req: AuthRequest, res: Response) => {
  try {
    await nurseService.deactivateNurse(getParam(req.params.id), req.user);
    res.status(200).json({ status: "berhasil", message: "Perawat berhasil dinonaktifkan" });
  } catch (error) {
    sendError(res, error);
  }
};
