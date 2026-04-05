const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { Anthropic } = require("@anthropic-ai/sdk");

const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

const MODEL = "claude-haiku-4-5-20251001";

function extractJsonObject(text) {
  const trimmed = String(text).trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("No JSON object in model response");
  }
  return JSON.parse(body.slice(start, end + 1));
}

function normalizeLines(parsed) {
  const raw = parsed?.lines;
  if (!Array.isArray(raw)) {
    throw new Error("Response must include a lines array");
  }
  const lines = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const description = String(row.description ?? "").trim();
    if (!description) continue;
    const unitPrice = Math.max(0, Number(row.unitPrice));
    const quantity = Math.max(1, Math.trunc(Number(row.quantity) || 1));
    const vatPercent = Number.isFinite(Number(row.vatPercent))
      ? Math.max(0, Number(row.vatPercent))
      : 20;
    lines.push({
      description,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      quantity,
      vatPercent,
    });
  }
  if (lines.length > 50) {
    return lines.slice(0, 50);
  }
  return lines;
}

exports.parseQuoteLines = onCall(
  {
    region: "us-central1",
    secrets: [anthropicApiKey],
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    const text = request.data?.text;
    if (typeof text !== "string" || !text.trim()) {
      throw new HttpsError("invalid-argument", "Field `text` is required.");
    }

    const apiKey = anthropicApiKey.value();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "ANTHROPIC_API_KEY is not configured.");
    }

    const client = new Anthropic({ apiKey });

    const system = `You extract UK-style quote line items from free-form text. Return ONLY valid JSON, no markdown outside the JSON object.
Schema:
{"lines":[{"description":"string","unitPrice":number,"quantity":number,"vatPercent":number}]}
Rules:
- description: short service or product line (English).
- unitPrice: numeric GBP amount per unit when given; use 0 if unknown.
- quantity: integer >= 1; default 1.
- vatPercent: UK VAT rate as a number (e.g. 20 for 20%); default 20 if not specified.
- One object per distinct charge; merge duplicates only if clearly the same item.
- If the input lists multiple prices (e.g. "grass £100 + hedge £60"), output multiple lines.
- Short shorthands like "£5 Grass cutting" or "Grass cutting £5" map to one line with that price and description.`;

    const userContent = `Parse this into line items:\n\n${text.trim()}`;

    let rawText;
    try {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: userContent }],
      });
      const block = message.content?.[0];
      rawText = block?.type === "text" ? block.text : "";
      if (!rawText) {
        throw new Error("Empty model response");
      }
    } catch (e) {
      console.error("Anthropic error", e);
      // 429 = rate limit / quota exhausted
      const status = e?.status ?? e?.statusCode ?? e?.error?.status;
      if (status === 429 || String(e?.message).toLowerCase().includes("credit")) {
        throw new HttpsError("resource-exhausted", "AI quota exhausted.");
      }
      throw new HttpsError(
        "internal",
        e?.message || "Model request failed",
      );
    }

    let lines;
    try {
      const parsed = extractJsonObject(rawText);
      lines = normalizeLines(parsed);
    } catch (e) {
      console.error("Parse error", e, rawText);
      throw new HttpsError(
        "internal",
        e?.message || "Could not parse model output",
      );
    }

    return { lines };
  },
);
