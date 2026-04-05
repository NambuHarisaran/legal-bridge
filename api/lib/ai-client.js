import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODELS = [
  "gemini-3-flash-preview",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

const MAX_RETRIES_PER_MODEL = 2;
let client = null;
let clientKey = "";

function getClient() {
  const key = String(process.env.GOOGLE_API_KEY || "").trim();
  if (!key) {
    throw new Error("GOOGLE_API_KEY is not configured.");
  }

  if (!client || clientKey !== key) {
    client = new GoogleGenerativeAI(key);
    clientKey = key;
  }

  return client;
}

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

function shouldRetrySameModel(error) {
  const status = Number(error?.status);
  const message = String(error?.message || "").toLowerCase();
  return (
    status === 429 ||
    status === 500 ||
    status === 503 ||
    message.includes("too many requests") ||
    message.includes("rate limit") ||
    message.includes("high demand") ||
    message.includes("service unavailable")
  );
}

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateWithFallback({ contents, systemInstruction, generationConfig }) {
  const aiClient = getClient();
  const models = getModelCandidates();
  let lastError = null;

  for (const modelName of models) {
    const model = aiClient.getGenerativeModel({ model: modelName });

    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt += 1) {
      try {
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

        if (attempt < MAX_RETRIES_PER_MODEL && shouldRetrySameModel(error)) {
          const waitMs = 350 * (attempt + 1);
          await delay(waitMs);
          continue;
        }

        if (!shouldTryNextModel(error)) {
          throw error;
        }
        break;
      }
    }
  }

  throw lastError || new Error("All configured AI models failed");
}
