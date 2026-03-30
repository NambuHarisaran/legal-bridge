import { GoogleGenerativeAI } from "@google/generative-ai";

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
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const systemPrompt = `You are a friendly AI Legal Assistant for "Legal Bridge", a platform helping rural Indian citizens understand legal matters.
- Answer in simple, clear English; mix Tamil words when appropriate for rural users
- Focus on Indian laws, rights, government schemes and procedures
- Give practical, actionable steps with numbered lists
- Always note: consult a real lawyer for serious matters
- Be warm, empathetic and supportive
- If asked in Tamil or Tanglish, reply accordingly`;

    // Convert messages to Gemini format
    const formattedMessages = messages.slice(-10).map(msg => ({
      role: msg.role === "user" ? "user" : "model",
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

    const text = response.response.text() || "Sorry, I could not process that. Please try again.";
    return res.status(200).json({ reply: text });
  } catch (err) {
    console.error("Chat API error:", err);
    if (isRetryableQuotaError(err)) {
      return res.status(200).json({ reply: buildFallbackReply(req.body?.messages) });
    }
    return res.status(500).json({ error: "AI service error. Please try again." });
  }
}
