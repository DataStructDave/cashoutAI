import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import sharp from "sharp";

const app = express();
const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } });
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

if (!process.env.OPENAI_API_KEY) console.warn("⚠️ OPENAI_API_KEY not set");

const receiptSchema = {
  type: "object",
  properties: {
    receipts: {
      type: "array",
      items: {
        type: "object",
        required: ["index", "text"],
        properties: {
          index: { type: "number" },
          text: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  required: ["receipts"],
  additionalProperties: false,
};

function normalizePayment(value) {
  if (value == null || typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v) return undefined;
  const lower = v.toLowerCase();
  if (lower.includes("visa")) return "Visa";
  if (lower.includes("mastercard") || lower.includes("master")) return "Mastercard";
  if (lower.includes("debit") || lower.includes("interac")) return "Debit";
  if (lower.includes("amex") || lower.includes("american")) return "Amex";
  if (lower.includes("cash")) return "Cash";
  if (lower.includes("credit")) return "Other";
  return "Other";
}

function normalizeEntry(obj) {
  const num = (v) =>
    v == null || v === "" ? undefined : Number(v).toFixed(2);
  const payment =
    normalizePayment(obj.paymentType) ?? normalizePayment(obj.payment_method);
  return {
    subtotal: num(obj.subtotal),
    tip: num(obj.tip),
    total: num(obj.total) ?? "0.00",
    paymentType: payment,
  };
}

const PARSE_SYSTEM = `You are a receipt parsing assistant. Extract numbers EXACTLY as written—do not round or guess. Copy each digit from the raw text.

Definitions:
- subtotal: amount before tax/tip (Subtotal, Sub-total, Food, Items)
- tip: gratuity (default 0 if missing)
- total: final amount paid (Total, Amount Due, Grand Total)
- payment_method: one of "VISA", "MASTERCARD", "AMEX", "INTERAC", "CREDIT", "debit", "Cash"

Return ONLY valid JSON. For multiple receipts use: {"receipts":[{"subtotal":<number>,"tip":<number>,"total":<number>,"payment_method":<string>}, ...]}
One object per receipt in the same order as the input. If unsure about a number, use null. No commentary, no markdown.`;

// Parse all receipts in one API call (much faster than N separate calls)
async function parseAllReceipts(rawReceipts) {
  if (!rawReceipts?.length) return [];
  const texts = rawReceipts.map((r, i) => `--- Receipt ${i + 1} ---\n${r.text ?? String(r)}`).join("\n\n");
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: PARSE_SYSTEM },
      {
        role: "user",
        content: `Extract subtotal, tip, total, payment_method for each receipt below. Return one JSON object with a "receipts" array; one entry per receipt in the same order.\n\n${texts}`,
      },
    ],
    temperature: 0,
    max_tokens: Math.min(4000, 300 + rawReceipts.length * 300),
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed.receipts) ? parsed.receipts : [];
    return list.map((r) => ({
      subtotal: r?.subtotal ?? null,
      tip: r?.tip ?? 0,
      total: r?.total ?? null,
      payment_method: r?.payment_method ?? null,
    }));
  } catch (err) {
    console.error("❌ Parse all receipts failed:", err);
    return rawReceipts.map(() => ({ subtotal: null, tip: 0, total: null, payment_method: null }));
  }
}

async function extractTotalsFromRawReceipts(rawReceipts) {
  if (!rawReceipts?.length) return [];
  return parseAllReceipts(rawReceipts);
}

/** Preprocess images for better GPT vision/OCR: resize, sharpen, normalize contrast */
async function preprocessImage(buffer, mimetype) {
  try {
    let pipeline = sharp(buffer)
      .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
      .normalize()
      .sharpen({ sigma: 0.5 })
      .jpeg({ quality: 90 });

    const result = await pipeline.toBuffer();
    return { buffer: result, mimetype: "image/jpeg" };
  } catch (err) {
    console.warn("⚠️ Image preprocessing failed, using original:", err?.message);
    return { buffer, mimetype: mimetype || "image/jpeg" };
  }
}

app.post(
  "/api/extract-text",
  upload.array("images"),
  async (req, res) => {
    console.log("\n📸 OCR Raw Text Extraction Request");

    try {
      const files = req.files ?? [];
      if (!files.length)
        return res.status(400).json({ error: "No images uploaded" });

      console.log(`Received ${files.length} image(s)`);
      files.forEach((f, i) =>
        console.log(`  [${i}] ${f.originalname} – ${(f.size / 1024 / 1024).toFixed(2)} MB`)
      );

      const processed = await Promise.all(
        files.map((f) => preprocessImage(f.buffer, f.mimetype))
      );

      const completion = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `
You are an OCR assistant.
The user will send 1–30 receipts in images (possibly overlapping, rotated, or partially visible).
Your job is to transcribe *all visible text* from each receipt — nothing else.

Return a JSON object that looks like this:
{
  "receipts": [
    { "index": 1, "text": "<full raw text of first receipt>" },
    { "index": 2, "text": "<full raw text of second receipt>" },
    ...
  ]
}

Rules:
- Group text into separate receipts if they appear visually distinct.
- Keep formatting as close as possible to the actual text.
- DO NOT interpret, summarize, or add fields (subtotal, tip, total, etc).
- DO NOT add extra commentary, only return JSON.
            `.trim(),
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract raw text from all receipts. Return only valid JSON following the schema.",
              },
              ...processed.map((p) => ({
                type: "image_url",
                image_url: {
                  url: `data:${p.mimetype};base64,${p.buffer.toString("base64")}`,
                },
              })),
            ],
          },
        ],
        temperature: 0,
        max_tokens: 8000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "receipts",
            strict: true,
            schema: receiptSchema,
          },
        },
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.error("❌ JSON parse failed:", e);
        return res.status(500).json({ error: "Model returned invalid JSON" });
      }

      const receipts = Array.isArray(parsed.receipts) ? parsed.receipts : [];
      const structuredReceipts = await extractTotalsFromRawReceipts(receipts);
      const entries = structuredReceipts.map(normalizeEntry);

      res.json({ structuredReceipts, entries });
    } catch (err) {
      console.error("Server error:", err);
      res.status(500).json({ error: err?.message || "Internal server error" });
    }
  }
);

app.post(
  "/api/ocr-text",
  upload.array("images"),
  async (req, res) => {
    console.log("\n🧾 OCR ONLY Request");

    try {
      const files = req.files ?? [];
      if (!files.length) {
        return res.status(400).json({ error: "No images uploaded" });
      }

      const processed = await Promise.all(
        files.map((f) => preprocessImage(f.buffer, f.mimetype))
      );

      const completion = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `
You are an OCR assistant.
Your task is to transcribe ALL visible text from the image(s) exactly as written.

Rules:
- Do NOT summarize or interpret
- Do NOT extract totals or fields
- Preserve line breaks where possible
- Return ONLY valid JSON

Format:
{
  "images": [
    { "index": 1, "text": "<raw text>" },
    { "index": 2, "text": "<raw text>" }
  ]
}
            `.trim(),
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all visible text from these images." },
              ...processed.map((p) => ({
                type: "image_url",
                image_url: {
                  url: `data:${p.mimetype};base64,${p.buffer.toString("base64")}`,
                },
              })),
            ],
          },
        ],
        temperature: 0,
        max_tokens: 8000,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      console.log(parsed);

      res.json(parsed);
    } catch (err) {
      console.error("❌ OCR route error:", err);
      res.status(500).json({ error: err?.message || "Internal server error" });
    }
  }
);


const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`)
);
