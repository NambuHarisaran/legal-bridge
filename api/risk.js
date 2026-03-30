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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { answers } = req.body;

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ error: "answers object is required" });
    }

    const summary = Object.entries(answers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const systemPrompt = `You are a legal risk assessor for Indian citizens. Respond ONLY with valid JSON (no markdown, no backticks) with:
- risk_level: "Low", "Medium", or "High"
- risk_score: integer 0-100
- reason: 2-3 sentences explaining the risk level
- urgent_actions: array of exactly 3 specific immediate actions (strings)
- long_term_advice: 1-2 sentence string`;

    const response = await model.generateContent({
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

    const raw = response.response.text() || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      return res.status(200).json(parsed);
    } catch {
      return res.status(200).json(buildFallbackRisk(answers));
    }
  } catch (err) {
    console.error("Risk API error:", err);
    if (isRetryableQuotaError(err)) {
      return res.status(200).json(buildFallbackRisk(req.body?.answers));
    }
    return res.status(500).json({ error: "Risk assessment failed. Please try again." });
  }
}
