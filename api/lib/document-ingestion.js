import { PDFParse } from "pdf-parse";
import { generateWithFallback } from "./ai-client.js";

function normalizeText(value) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removePdfNoise(text) {
  return String(text || "")
    .replace(/--?\s*\d+\s+of\s+\d+\s*--?/gi, " ")
    .replace(/\bpage\s+\d+\s+of\s+\d+\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeLowSignalPdfText(text) {
  const cleaned = removePdfNoise(text);
  const alphaCount = (cleaned.match(/[a-zA-Z]/g) || []).length;
  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
  return cleaned.length < 180 || alphaCount < 120 || wordCount < 30;
}

async function extractTextFromPdfWithGemini(buffer) {
  const prompt = [
    "Extract all readable text from this PDF document.",
    "Return plain text only.",
    "Do not summarize.",
    "Do not add markdown.",
    "Preserve important clauses, headings, names, dates, and numbers.",
  ].join(" ");

  const { text } = await generateWithFallback({
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: buffer.toString("base64"),
            },
          },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 3500,
      temperature: 0,
    },
  });

  return removePdfNoise(normalizeText(text));
}

async function extractTextFromPdf(buffer) {
  let parsedText = "";

  try {
    const parser = new PDFParse({ data: buffer });
    let parsed;
    try {
      parsed = await parser.getText();
    } finally {
      await parser.destroy().catch(() => {});
    }

    parsedText = removePdfNoise(normalizeText(parsed?.text || ""));
    if (!looksLikeLowSignalPdfText(parsedText)) {
      return {
        text: parsedText,
        source: "pdf_text",
        confidence: parsedText.length > 900 ? 0.95 : 0.85,
      };
    }
  } catch {
    parsedText = "";
  }

  try {
    const geminiText = await extractTextFromPdfWithGemini(buffer);
    if (geminiText && geminiText.length > Math.max(parsedText.length, 80)) {
      return {
        text: geminiText,
        source: "pdf_vision_extract",
        confidence: geminiText.length > 700 ? 0.82 : 0.68,
      };
    }
  } catch {
    // Fall back to parser output if vision extraction fails.
  }

  const text = parsedText;
  return {
    text,
    source: "pdf_text",
    confidence: text.length > 400 ? 0.8 : 0.5,
  };
}

async function extractTextFromImage(buffer, mimeType) {
  const prompt = `Extract visible text from this legal document image. Return plain text only, no markdown, no explanation.`;
  const { text } = await generateWithFallback({
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: buffer.toString("base64"),
            },
          },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 1800,
      temperature: 0,
    },
  });

  const normalized = normalizeText(text);
  return {
    text: normalized,
    source: "image_ocr",
    confidence: normalized.length > 120 ? 0.8 : 0.55,
  };
}

export async function ingestDocumentFromUpload({ buffer, mimeType }) {
  const normalizedMime = String(mimeType || "").toLowerCase();

  if (normalizedMime === "application/pdf") {
    return extractTextFromPdf(buffer);
  }

  if (["image/jpeg", "image/png", "image/webp"].includes(normalizedMime)) {
    return extractTextFromImage(buffer, normalizedMime);
  }

  throw new Error("Unsupported file type for ingestion");
}
