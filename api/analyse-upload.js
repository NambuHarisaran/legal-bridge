import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  guardApiRequest,
  hasPromptInjectionPatterns,
  safeLog,
  sendSafeError,
} from "./middleware/request-security.js";

const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = client.getGenerativeModel({ model: "gemini-3-flash-preview" });

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

function buildFallbackAnalysis(name) {
  return {
    summary: `Uploaded file (${name}) was accepted securely, but analysis is temporarily unavailable.`,
    key_points: [
      "File type and size checks passed.",
      "The upload was processed in a secure transient path.",
      "Please retry shortly for AI extraction.",
    ],
    parties: [],
    dates: [],
    risks: ["AI processing unavailable for this request."],
    next_steps: [
      "Retry document analysis in a few minutes.",
      "Use paste-text mode for immediate analysis.",
      "Consult a legal professional for critical deadlines.",
    ],
  };
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

    const prompt = `Analyze this legal document and respond ONLY with valid JSON keys: summary, key_points, parties, dates, risks, next_steps. Do not include markdown.`;
    if (hasPromptInjectionPatterns(cleanName)) {
      return sendSafeError(res, 400, "invalid_upload", "Unsafe file metadata detected");
    }

    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: file.mimetype,
                data: file.buffer.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.2,
      },
    });

    const raw = response?.response?.text?.() || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      return res.status(200).json(parsed);
    } catch {
      return res.status(200).json(buildFallbackAnalysis(cleanName));
    }
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