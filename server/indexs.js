import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import sharp from "sharp";
import heicConvert from "heic-convert";

const isProd = process.env.NODE_ENV === "production";
const API_SECRET = process.env.API_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN; // comma-separated origins, or empty = allow all in dev

if (isProd && !process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is required in production.");
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) console.warn("⚠️ OPENAI_API_KEY not set");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.set("trust proxy", 1);
const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } });

// CORS: restrict origins in production when CORS_ORIGIN is set
const corsOptions = CORS_ORIGIN
  ? { origin: CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean) }
  : {};
app.use(cors(corsOptions));

// Rate limiting (per IP)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 30 : 1000,
  message: { error: "Too many requests. Try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json({ limit: "1mb" }));

// Optional API key auth: when API_SECRET is set, require x-api-key header
function requireApiKey(req, res, next) {
  if (!API_SECRET) return next();
  const key = req.headers["x-api-key"];
  if (key !== API_SECRET) {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }
  next();
}
app.use("/api", requireApiKey);

/** Return safe error message to client (no internal details in production) */
function clientError(err) {
  if (isProd) return "Internal server error";
  return err?.message || "Internal server error";
}

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

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

const EXTRACT_SYSTEM = `
You are a receipt extraction assistant. The user will send receipt images. 

For EACH receipt, extract:
- subtotal: amount before tax/tip (required). If missing, return null.
- tip: gratuity in dollars (required, default 0 if missing).
- total: final amount paid (required). If missing, return null.
- payment_method: one of "Visa", "Mastercard", "Amex", "Debit", "Cash", "Other" (required). if "interac" return "Debit".

Rules:
- Copy all digits exactly as written; do not round or guess.
- One entry per receipt, same order as they appear visually in the image.
- If an image contains multiple receipts, create one entry per receipt.
- Return ONLY valid JSON: 
  { "entries": [ { "subtotal": number or null, "tip": number, "total": number or null, "payment_method": string }, ... ] }
- No commentary or markdown.
-

Ensure the output is valid JSON and matches the schema exactly.
`;


const IMAGE_MAX = 1536;
const JPEG_QUALITY = 99;

/** Smaller images + one vision call = faster upload and inference */
async function preprocessImage(buffer, mimetype) {
  try {
    const result = await sharp(buffer)
      .resize(IMAGE_MAX, IMAGE_MAX, { fit: "inside", withoutEnlargement: true })
      .normalize()
      .sharpen({ sigma: 0.7 })
      //.grayscale()
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    return { buffer: result, mimetype: "image/jpeg" };
  } catch (err) {
    console.warn("⚠️ Image preprocessing failed, using original:", err?.message);
    // Often iOS sends HEIC with .jpg extension; Sharp can't decode HEIC. Convert to JPEG.
    try {
      const jpegBuffer = await heicConvert({
        buffer,
        format: "JPEG",
        quality: 0.92,
      });
      const result = await sharp(jpegBuffer)
        .resize(IMAGE_MAX, IMAGE_MAX, { fit: "inside", withoutEnlargement: true })
        .normalize()
        .sharpen({ sigma: 0.7 })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
      console.log("✅ HEIC converted to JPEG");
      return { buffer: result, mimetype: "image/jpeg" };
    } catch (heicErr) {
      console.warn("⚠️ HEIC conversion failed:", heicErr?.message);
      throw new Error(
        "Unsupported image format. Please use JPEG or PNG. (iPhone: use a photo exported as JPEG or take a new photo.)"
      );
    }
  }
}

app.post(
  "/api/extract-text",
  upload.array("images"),
  async (req, res) => {
    console.log("\n📸 Extract-text (single API call)");

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
          { role: "system", content: EXTRACT_SYSTEM },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract subtotal, tip, total, payment_method for each receipt image. Return JSON: { \"entries\": [ { \"subtotal\", \"tip\", \"total\", \"payment_method\" }, ... ] }. One entry per receipt, same order. Copy numbers exactly.",
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
        max_tokens: Math.min(4096, 400 + processed.length * 300),
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.error("❌ JSON parse failed:", e);
        return res.status(500).json({ error: "Model returned invalid JSON" });
      }

      const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const entries = rawEntries.map((e) =>
        normalizeEntry({
          subtotal: e?.subtotal,
          tip: e?.tip,
          total: e?.total,
          payment_method: e?.payment_method,
        })
      );
      res.json({ entries });
    } catch (err) {
      console.error("Server error:", err);
      res.status(500).json({ error: clientError(err) });
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
            content: "OCR assistant. Transcribe all visible text from each image. Return JSON only: { \"images\": [ { \"index\": 1, \"text\": \"...\" }, ... ] }. No interpretation.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract raw text from these images. Return valid JSON with images array." },
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
        max_tokens: Math.min(8192, 1200 + files.length * 800),
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.error("❌ OCR JSON parse failed:", e);
        return res.status(500).json({ error: "Model returned invalid JSON" });
      }
      res.json(parsed);
    } catch (err) {
      console.error("❌ OCR route error:", err);
      res.status(500).json({ error: clientError(err) });
    }
  }
);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`)
);

function shutdown() {
  console.log("Shutting down...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
