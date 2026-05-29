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

const hasAllowedImageSignature = async (file: Express.Multer.File) => {
  const buffer = await fs.promises.readFile(file.path);

  if (file.mimetype === "image/jpeg") {
    return buffer.length >= 3
      && buffer[0] === 0xff
      && buffer[1] === 0xd8
      && buffer[2] === 0xff;
  }

  if (file.mimetype === "image/png") {
    return buffer.length >= 8
      && buffer[0] === 0x89
      && buffer[1] === 0x50
      && buffer[2] === 0x4e
      && buffer[3] === 0x47
      && buffer[4] === 0x0d
      && buffer[5] === 0x0a
      && buffer[6] === 0x1a
      && buffer[7] === 0x0a;
  }

  if (file.mimetype === "image/webp") {
    return buffer.length >= 12
      && buffer.subarray(0, 4).toString("ascii") === "RIFF"
      && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }

  return false;
};

const deleteUploadedFile = async (file?: Express.Multer.File) => {
  if (!file?.path) return;
  await fs.promises.unlink(file.path).catch(() => undefined);
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
  foodImageUpload.single("image")(req, res, async (error) => {
    if (!error) {
      try {
        if (req.file && !(await hasAllowedImageSignature(req.file))) {
          await deleteUploadedFile(req.file);
          return res.status(400).json({ status: "gagal", message: "Isi file tidak cocok dengan format gambar", error_code: "INVALID_IMAGE_CONTENT" });
        }
      } catch (signatureError) {
        await deleteUploadedFile(req.file);
        next(signatureError);
        return;
      }

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
