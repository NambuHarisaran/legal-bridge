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

function buildFallbackReply(messages) {
  const lastUserText = [...(messages || [])]
    .reverse()
    .find((msg) => msg?.role === "user")?.content;

  return [
    "I am temporarily in offline support mode because the AI service hit a rate limit.",
    "",
    "Based on your question, here are safe first steps:",
    "1. Keep all relevant documents and IDs in one folder.",
    "2. Note dates, names, phone numbers, and any written communication.",
    "3. Contact your District Legal Services Authority (DLSA) for free legal aid.",
    "4. For urgent safety issues, approach the nearest police station immediately.",
    "",
    lastUserText ? `Your question captured: ${lastUserText}` : "",
    "",
    "For serious matters, please consult a licensed lawyer."
  ].filter(Boolean).join("\n");
}

export default async function handler(req, res) {
  const guard = await guardApiRequest(req, res, {
    endpoint: "chat",
    method: "POST",
    maxBodyBytes: 256 * 1024,
  });
  if (!guard.ok) return;

  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return sendSafeError(res, 400, "invalid_payload", "messages must be an array");
    }

    if (messages.length === 0 || messages.length > 20) {
      return sendSafeError(res, 400, "invalid_payload", "messages must contain 1 to 20 items");
    }

    const sanitizedMessages = messages
      .filter((msg) => msg && typeof msg === "object")
      .map((msg) => {
        const content = sanitizeAiInput(msg.content, 1000);
        const role = msg.role === "user" ? "user" : "model";
        return { role, content };
      })
      .filter((msg) => msg.content.length > 0)
      .slice(-10);

    if (sanitizedMessages.length === 0) {
      return sendSafeError(res, 400, "invalid_payload", "messages must include non-empty content");
    }

    const totalChars = sanitizedMessages.reduce((acc, msg) => acc + msg.content.length, 0);
    if (totalChars > 8000) {
      return sendSafeError(res, 400, "invalid_payload", "messages are too long");
    }

    const suspicious = sanitizedMessages.some((msg) => msg.role === "user" && hasPromptInjectionPatterns(msg.content));
    if (suspicious) {
      return sendSafeError(res, 400, "unsafe_prompt", "Input contains disallowed instruction patterns");
    }

    const systemPrompt = `You are a friendly AI Legal Assistant for "Legal Bridge", a platform helping rural Indian citizens understand legal matters.
- Answer in simple, clear English; mix Tamil words when appropriate for rural users
- Focus on Indian laws, rights, government schemes and procedures
- Give practical, actionable steps with numbered lists
- Always note: consult a real lawyer for serious matters
- Be warm, empathetic and supportive
- If asked in Tamil or Tanglish, reply accordingly`;

    // Convert messages to Gemini format
    const formattedMessages = sanitizedMessages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const response = await model.generateContent({
      contents: formattedMessages,
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
    });

    const text = response?.response?.text?.() || "Sorry, I could not process that. Please try again.";
    return res.status(200).json({ reply: text });
  } catch (err) {
    safeLog("chat_error", {
      path: req.path,
      uid: req.user?.uid,
      ip: req.ip,
      message: err?.message,
      status: err?.status,
    });
    if (isRetryableQuotaError(err)) {
      return res.status(200).json({ reply: buildFallbackReply(req.body?.messages) });
    }
    return sendSafeError(res, 500, "ai_service_error", "Unable to process request");
  }
}
