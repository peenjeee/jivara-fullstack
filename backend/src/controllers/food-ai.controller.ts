import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as foodAiService from "../services/food-ai.service";

const sendError = (res: Response, error: unknown) => {
  const err = error as { status?: number; message?: string; code?: string };
  const status = err.status || 500;

  return res.status(status).json({
    status: "error",
    message: status >= 500 ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
    ...(err.code && { error_code: err.code }),
  });
};

export const uploadFoodImage = async (req: AuthRequest, res: Response) => {
  try {
    const data = await foodAiService.uploadFoodImage(req.body);
    res.status(200).json({ status: "success", data });
  } catch (error) {
    sendError(res, error);
  }
};

export const detectFood = async (req: AuthRequest, res: Response) => {
  try {
    const data = await foodAiService.detectFood(req.body);
    res.status(200).json({ status: "success", data });
  } catch (error) {
    sendError(res, error);
  }
};

export const checkInteraction = async (req: AuthRequest, res: Response) => {
  try {
    const data = await foodAiService.checkInteraction(req.body);
    res.status(200).json({ status: "success", data });
  } catch (error) {
    sendError(res, error);
  }
};

export const estimateNutrition = async (req: AuthRequest, res: Response) => {
  try {
    const data = await foodAiService.estimateNutrition(req.body);
    res.status(200).json({ status: "success", data });
  } catch (error) {
    sendError(res, error);
  }
};
