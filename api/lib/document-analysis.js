import { generateWithFallback } from "./ai-client.js";

function normalizeArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 10);
}

function extractJsonObject(text) {
  const raw = String(text || "").replace(/```json|```/g, "").trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first >= 0 && last > first) {
      const candidate = raw.slice(first, last + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeAnalysisShape(parsed, fallbackSummary) {
  return {
    summary: String(parsed?.summary || "").trim() || fallbackSummary,
    key_points: normalizeArray(parsed?.key_points),
    parties: normalizeArray(parsed?.parties),
    dates: normalizeArray(parsed?.dates),
    risks: normalizeArray(parsed?.risks),
    next_steps: normalizeArray(parsed?.next_steps).slice(0, 3),
  };
}

export function buildFallbackAnalysis(content = "") {
  const compact = String(content || "").replace(/\s+/g, " ").trim();
  const snippet = compact.slice(0, 220) || "No document text provided.";
  return {
    summary: "Document was ingested successfully. AI semantic analysis is currently in fallback mode.",
    key_points: [
      "Confirm all parties and identities are accurate.",
      "Review dates, payment terms, and legal obligations carefully.",
      "Check penalty, termination, and dispute-resolution clauses.",
      "Consult legal aid before signing or filing if the matter is urgent.",
    ],
    parties: [],
    dates: [],
    risks: ["AI analysis is temporarily limited. Perform a manual legal review."],
    next_steps: [
      "Retry analysis in a few minutes.",
      "Share this document with legal aid for human verification.",
      `Captured snippet: ${snippet}`,
    ],
  };
}

export async function analyzeLegalDocumentText(text) {
  const trimmed = String(text || "").replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return buildFallbackAnalysis("");
  }

  const systemPrompt = `You are a legal document analyser for Indian citizens. Respond ONLY with valid JSON (no markdown) with keys:
- summary: 2-3 sentence plain-language summary
- key_points: array of 4-6 key points
- parties: array of party names/roles mentioned
- dates: array of important dates/deadlines
- risks: array of potential legal risks
- next_steps: array of 3 practical next steps`;

  try {
    const { text: raw } = await generateWithFallback({
      contents: [
        {
          role: "user",
          parts: [{ text: `Analyse this legal document text:\n\n${trimmed.slice(0, 12000)}` }],
        },
      ],
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: 1200,
        temperature: 0.25,
        responseMimeType: "application/json",
      },
    });

    const parsed = extractJsonObject(raw);
    if (parsed) {
      return normalizeAnalysisShape(parsed, buildFallbackAnalysis(trimmed).summary);
    }

    const { text: repairRaw } = await generateWithFallback({
      contents: [
        {
          role: "user",
          parts: [{ text: `Convert this into strict JSON with keys summary, key_points, parties, dates, risks, next_steps.\n\n${raw.slice(0, 6000)}` }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 1200,
        temperature: 0,
        responseMimeType: "application/json",
      },
    });

    const repaired = extractJsonObject(repairRaw);
    if (repaired) {
      return normalizeAnalysisShape(repaired, buildFallbackAnalysis(trimmed).summary);
    }

    return buildFallbackAnalysis(trimmed);
  } catch {
    return buildFallbackAnalysis(trimmed);
  }
}
