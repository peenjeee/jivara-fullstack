import fs from "fs/promises";
import express, { Request, Response } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { uploadSingleFoodImage } from "../../src/middleware/upload.middleware";

const app = express();

app.post("/upload", uploadSingleFoodImage, (req: Request, res: Response) => {
  res.status(200).json({ filePath: req.file?.path });
});

describe("upload middleware", () => {
  it("rejects files with image MIME type but invalid content", async () => {
    const response = await request(app)
      .post("/upload")
      .attach("image", Buffer.from("not really a png"), {
        filename: "spoof.png",
        contentType: "image/png",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      status: "gagal",
      error_code: "INVALID_IMAGE_CONTENT",
    });
  });

  it("accepts files whose content matches the declared image type", async () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

    const response = await request(app)
      .post("/upload")
      .attach("image", pngHeader, {
        filename: "valid.png",
        contentType: "image/png",
      })
      .expect(200);

    expect(response.body.filePath).toContain("food-scans");
    await fs.unlink(response.body.filePath).catch(() => undefined);
  });
});
