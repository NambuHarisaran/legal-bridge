import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  guardApiRequest,
  hasPromptInjectionPatterns,
  sanitizeAiInput,
  safeLog,
  sendSafeError,
} from "./middleware/request-security.js";

const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = client.getGenerativeModel({ model: "gemini-3-flash-preview" });

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

function buildFallbackAnalysis(content = "") {
  const compact = content.replace(/\s+/g, " ").trim();
  const snippet = compact.slice(0, 180) || "No document text provided.";
  return {
    summary: "Document received. AI analysis is temporarily in fallback mode due to rate limits.",
    key_points: [
      "Document text was captured successfully.",
      "Review party names, dates, obligations, and penalties.",
      "Check for termination and dispute-resolution clauses.",
      "Get legal review before signing any final agreement."
    ],
    parties: [],
    dates: [],
    risks: [
      "AI quota limit prevented full semantic analysis.",
      "Important legal clauses may require manual lawyer review."
    ],
    next_steps: [
      "Re-run analysis after Gemini quota resets.",
      "Share the document with a legal aid clinic or advocate.",
      `Captured snippet: ${snippet}`
    ]
  };
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

    const systemPrompt = `You are a legal document analyser for Indian citizens. Given legal document text, respond ONLY with valid JSON (no markdown, no backticks) with these keys:
- summary: 2-3 sentence plain-language summary
- key_points: array of 4-5 key points (strings)
- parties: array of party names/roles mentioned (strings)
- dates: array of important dates or deadlines (strings, empty if none)
- risks: array of potential risks or concerns (strings, empty if none)
- next_steps: array of 3 recommended next steps (strings)`;

    const response = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: `Analyse this legal document:\n\n${trimmedContent.slice(0, 4000)}` }]
      }],
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.3,
      },
    });

    const raw = response?.response?.text?.() || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      return res.status(200).json(parsed);
    } catch {
      return res.status(200).json(buildFallbackAnalysis(content));
    }
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
