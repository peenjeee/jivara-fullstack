import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import multer from "multer";

const foodScanUploadDir = path.resolve(process.cwd(), "uploads", "food-scans");

fs.mkdirSync(foodScanUploadDir, { recursive: true });

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionByMimeType: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, foodScanUploadDir),
  filename: (_req, file, cb) => {
    const extension = extensionByMimeType[file.mimetype] || ".jpg";
    cb(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

export const foodImageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      cb(new Error("INVALID_IMAGE_TYPE"));
      return;
    }

    cb(null, true);
  },
});

export const uploadSingleFoodImage = (req: Request, res: Response, next: NextFunction) => {
  foodImageUpload.single("image")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ status: "gagal", message: "Ukuran gambar maksimal 5MB", error_code: "FILE_TOO_LARGE" });
    }

    if (error instanceof Error && error.message === "INVALID_IMAGE_TYPE") {
      return res.status(400).json({ status: "gagal", message: "File harus berupa gambar JPG, PNG, atau WebP", error_code: "INVALID_IMAGE_TYPE" });
    }

    next(error);
  });
};

export const getFoodScanPublicPath = (filename: string) => `/uploads/food-scans/${filename}`;
