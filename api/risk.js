import {
  guardApiRequest,
  hasPromptInjectionPatterns,
  sanitizeAiInput,
  safeLog,
  sendSafeError,
} from "./middleware/request-security.js";
import { generateWithFallback } from "./lib/ai-client.js";

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

function buildFallbackRisk(answers = {}) {
  const hasDocs = String(answers?.docs || "").toLowerCase().includes("yes");
  const hasAction = !String(answers?.action || "").toLowerCase().includes("no action");
  let riskScore = 60;
  if (hasDocs) riskScore -= 10;
  if (hasAction) riskScore -= 10;
  riskScore = Math.max(25, Math.min(85, riskScore));

  const riskLevel = riskScore >= 70 ? "High" : riskScore >= 40 ? "Medium" : "Low";
  return {
    risk_level: riskLevel,
    risk_score: riskScore,
    reason: "Fallback mode is active due to AI quota limits. This is a basic estimate from your answers and not a legal opinion.",
    urgent_actions: [
      "Organize all related documents and ID proofs.",
      "Write a dated timeline of events and people involved.",
      "Contact DLSA/legal aid for case-specific guidance."
    ],
    long_term_advice: "Use this score as a temporary guide and get a full legal review once AI service availability is restored."
  };
}

export default async function handler(req, res) {
  const guard = await guardApiRequest(req, res, {
    endpoint: "risk",
    method: "POST",
    maxBodyBytes: 256 * 1024,
  });
  if (!guard.ok) return;

  try {
    const { answers } = req.body;
    const allowedKeys = new Set(["issue", "amount", "docs", "deadline", "duration", "opponent", "action"]);

    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return sendSafeError(res, 400, "invalid_payload", "answers object is required");
    }

    const unknownKeys = Object.keys(answers).filter((key) => !allowedKeys.has(key));
    if (unknownKeys.length > 0) {
      return sendSafeError(res, 400, "invalid_payload", "answers contains unsupported fields");
    }

    const cleanedAnswers = Object.entries(answers)
      .reduce((acc, [key, value]) => {
        const normalized = sanitizeAiInput(value, 600);
        if (normalized) {
          acc[key] = normalized;
        }
        return acc;
      }, {});

    if (Object.keys(cleanedAnswers).length === 0) {
      return sendSafeError(res, 400, "invalid_payload", "answers must include at least one non-empty value");
    }

    const combinedText = Object.values(cleanedAnswers).join(" ");
    if (hasPromptInjectionPatterns(combinedText)) {
      return sendSafeError(res, 400, "unsafe_prompt", "Input contains disallowed instruction patterns");
    }

    const summary = Object.entries(cleanedAnswers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const systemPrompt = `You are a legal risk assessor for Indian citizens. Respond ONLY with valid JSON (no markdown, no backticks) with:
- risk_level: "Low", "Medium", or "High"
- risk_score: integer 0-100
- reason: 2-3 sentences explaining the risk level
- urgent_actions: array of exactly 3 specific immediate actions (strings)
- long_term_advice: 1-2 sentence string`;

    const response = await generateWithFallback({
      contents: [{
        role: "user",
        parts: [{ text: `Assess legal risk for this situation:\n${summary}` }]
      }],
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.3,
      },
    });

    const raw = response?.text || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      return res.status(200).json(parsed);
    } catch {
      return res.status(200).json(buildFallbackRisk(cleanedAnswers));
    }
  } catch (err) {
    safeLog("risk_error", {
      path: req.path,
      uid: req.user?.uid,
      ip: req.ip,
      message: err?.message,
      status: err?.status,
    });
    if (isRetryableQuotaError(err)) {
      return res.status(200).json(buildFallbackRisk(req.body?.answers));
    }
    return sendSafeError(res, 500, "risk_assessment_failed", "Unable to process risk assessment");
  }
}
