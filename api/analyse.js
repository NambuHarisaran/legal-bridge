import {
  guardApiRequest,
  hasPromptInjectionPatterns,
  sanitizeAiInput,
  safeLog,
  sendSafeError,
} from "./middleware/request-security.js";
import { analyzeLegalDocumentText, buildFallbackAnalysis } from "./lib/document-analysis.js";

function isRetryableQuotaError(err) {
  const status = Number(err?.status);
  const message = String(err?.message || "").toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    message.includes("429") ||
    message.includes("503") ||
    message.includes("rate limit") ||
    message.includes("high demand") ||
    message.includes("service unavailable")
  );
}

export default async function handler(req, res) {
  const guard = await guardApiRequest(req, res, {
    endpoint: "analyse",
    method: "POST",
    maxBodyBytes: 768 * 1024,
  });
  if (!guard.ok) return;

  try {
    const { content } = req.body;

    if (!content || typeof content !== "string") {
      return sendSafeError(res, 400, "invalid_payload", "content string is required");
    }

    const trimmedContent = sanitizeAiInput(content, 12000);
    if (!trimmedContent) {
      return sendSafeError(res, 400, "invalid_payload", "content must not be empty");
    }

    if (hasPromptInjectionPatterns(trimmedContent)) {
      return sendSafeError(res, 400, "unsafe_prompt", "Input contains disallowed instruction patterns");
    }

    const analysis = await analyzeLegalDocumentText(trimmedContent);
    return res.status(200).json(analysis);
  } catch (err) {
    safeLog("analyse_error", {
      path: req.path,
      uid: req.user?.uid,
      ip: req.ip,
      message: err?.message,
      status: err?.status,
    });
    if (isRetryableQuotaError(err)) {
      return res.status(200).json(buildFallbackAnalysis(req.body?.content || ""));
    }
    return sendSafeError(res, 500, "analysis_failed", "Unable to process document");
  }
}
