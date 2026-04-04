import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-3-flash-preview",
];

const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

function getModelCandidates() {
  const fromEnv = String(process.env.AI_MODEL_LIST || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return fromEnv.length > 0 ? fromEnv : DEFAULT_MODELS;
}

function shouldTryNextModel(error) {
  const status = Number(error?.status);
  const message = String(error?.message || "").toLowerCase();
  return (
    status === 404 ||
    status === 429 ||
    status === 500 ||
    status === 503 ||
    message.includes("not found") ||
    message.includes("unsupported") ||
    message.includes("service unavailable") ||
    message.includes("high demand") ||
    message.includes("rate limit")
  );
}

export async function generateWithFallback({ contents, systemInstruction, generationConfig }) {
  const models = getModelCandidates();
  let lastError = null;

  for (const modelName of models) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const response = await model.generateContent({
        contents,
        systemInstruction,
        generationConfig,
      });
      const text = response?.response?.text?.() || "";
      if (!text.trim()) {
        throw new Error("Model returned empty response");
      }
      return { text, model: modelName };
    } catch (error) {
      lastError = error;
      if (!shouldTryNextModel(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("All configured AI models failed");
}
