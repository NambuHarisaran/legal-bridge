import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import {
  guardApiRequest,
  hasPromptInjectionPatterns,
  safeLog,
  sendSafeError,
} from "./middleware/request-security.js";
import { ingestDocumentFromUpload } from "./lib/document-ingestion.js";
import { analyzeLegalDocumentText, buildFallbackAnalysis } from "./lib/document-analysis.js";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(String(file.mimetype || "").toLowerCase())) {
      return cb(new Error("Unsupported file type"));
    }
    return cb(null, true);
  },
});

function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function stripUnsafeName(name) {
  const base = path.basename(String(name || "upload"));
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
}

export default async function handler(req, res) {
  const guard = await guardApiRequest(req, res, {
    endpoint: "analyse-upload",
    method: "POST",
    maxBodyBytes: MAX_UPLOAD_BYTES + 128 * 1024,
  });
  if (!guard.ok) return;

  let tempPath = null;
  try {
    await runUpload(req, res);
    const file = req.file;

    if (!file || !file.buffer || file.size <= 0) {
      return sendSafeError(res, 400, "invalid_upload", "No valid file uploaded");
    }

    if (!ALLOWED_MIME_TYPES.has(String(file.mimetype || "").toLowerCase())) {
      return sendSafeError(res, 400, "invalid_upload", "Only PDF and image uploads are allowed");
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return sendSafeError(res, 413, "payload_too_large", "Uploaded file is too large");
    }

    const cleanName = stripUnsafeName(file.originalname);
    tempPath = path.join(os.tmpdir(), `${randomUUID()}-${cleanName}`);
    await fs.writeFile(tempPath, file.buffer);

    if (hasPromptInjectionPatterns(cleanName)) {
      return sendSafeError(res, 400, "invalid_upload", "Unsafe file metadata detected");
    }

    const ingestion = await ingestDocumentFromUpload({
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const extractedText = String(ingestion?.text || "").trim();
    if (!extractedText) {
      const fallback = buildFallbackAnalysis(cleanName);
      return res.status(200).json({
        ...fallback,
        ingestion: {
          mode: ingestion?.source || "unknown",
          confidence: ingestion?.confidence || 0,
          filename: cleanName,
          extractedChars: 0,
        },
      });
    }

    const analysis = await analyzeLegalDocumentText(extractedText);
    return res.status(200).json({
      ...analysis,
      ingestion: {
        mode: ingestion.source,
        confidence: ingestion.confidence,
        filename: cleanName,
        extractedChars: extractedText.length,
        preview: extractedText.slice(0, 220),
      },
    });
  } catch (error) {
    safeLog("analyse_upload_error", {
      path: req.path,
      uid: req.user?.uid,
      ip: req.ip,
      message: error?.message,
      status: error?.status,
    });
    return sendSafeError(res, 500, "upload_analysis_failed", "Unable to process uploaded file");
  } finally {
    if (tempPath) {
      await fs.unlink(tempPath).catch(() => {});
    }
  }
}