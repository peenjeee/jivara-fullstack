import fs from "fs/promises";
import path from "path";
import { getAppDateKey } from "../utils/app-timezone";

interface UploadedFile {
  readonly path: string;
  readonly filename: string;
  readonly mimetype: string;
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const encodeObjectPath = (value: string) => value.split("/").map(encodeURIComponent).join("/");

const getSupabaseStorageConfig = () => {
  const url = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_FOOD_SCAN_BUCKET;

  if (!url && !serviceRoleKey && !bucket) return null;
  if (!url || !serviceRoleKey || !bucket) {
    throw { status: 500, message: "Konfigurasi Supabase Storage belum lengkap", code: "STORAGE_NOT_CONFIGURED" };
  }

  return { url: trimTrailingSlash(url), serviceRoleKey, bucket };
};

export const uploadFoodScanImage = async (file: UploadedFile) => {
  const config = getSupabaseStorageConfig();

  if (!config) {
    return `/uploads/food-scans/${file.filename}`;
  }

  const fileBuffer = await fs.readFile(file.path);
  const objectPath = `food-scans/${getAppDateKey(new Date())}/${file.filename}`;
  const uploadUrl = `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${encodeObjectPath(objectPath)}`;
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey,
      "Content-Type": file.mimetype,
      "Cache-Control": "31536000",
      "x-upsert": "true",
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw { status: 502, message: "Upload gambar ke storage gagal", code: "STORAGE_UPLOAD_FAILED", detail };
  }

  await fs.unlink(file.path).catch(() => undefined);

  const publicBaseUrl = process.env.SUPABASE_STORAGE_PUBLIC_URL
    ? trimTrailingSlash(process.env.SUPABASE_STORAGE_PUBLIC_URL)
    : `${config.url}/storage/v1/object/public/${encodeURIComponent(config.bucket)}`;

  return `${publicBaseUrl}/${encodeObjectPath(objectPath)}`;
};

export const deleteLocalUploadIfExists = async (filePath?: string) => {
  if (!filePath) return;

  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(uploadsRoot)) return;

  await fs.unlink(resolvedPath).catch(() => undefined);
};
