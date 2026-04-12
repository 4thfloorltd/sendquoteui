const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { Anthropic } = require("@anthropic-ai/sdk");
const admin = require("firebase-admin");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");
const smtpHost = defineSecret("SMTP_HOST");
const smtpPort = defineSecret("SMTP_PORT");
const smtpUser = defineSecret("SMTP_USER");
const smtpPass = defineSecret("SMTP_PASS");
const smtpFrom = defineSecret("SMTP_FROM");
const verificationPepper = defineSecret("QUOTE_VERIFY_PEPPER");

const MODEL = "claude-haiku-4-5-20251001";
const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const VERIFICATION_MAX_ATTEMPTS = 5;

if (!admin.apps.length) {
  admin.initializeApp();
}

function hashVerificationCode(code, email) {
  const pepper = verificationPepper.value();
  if (!pepper) {
    throw new HttpsError("failed-precondition", "QUOTE_VERIFY_PEPPER is not configured.");
  }
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return crypto
    .createHash("sha256")
    .update(`${pepper}:${normalizedEmail}:${code}`)
    .digest("hex");
}

function makeVerificationCode() {
  // 6 digits, 100000-999999.
  return String(Math.floor(100000 + Math.random() * 900000));
}

function validateEmailAddress(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim().toLowerCase());
}

function toSafeDocId(value) {
  return Buffer.from(String(value || ""), "utf8").toString("base64url");
}

function mapSmtpErrorToHttpsError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "");
  const response = String(error?.response || "");
  const combined = `${code} ${message} ${response}`.toLowerCase();

  if (combined.includes("auth") || combined.includes("535") || combined.includes("5.7.3")) {
    return new HttpsError(
      "failed-precondition",
      "SMTP authentication failed. Check SMTP_USER/SMTP_PASS and ensure SMTP AUTH is enabled for the mailbox.",
    );
  }
  if (combined.includes("mail from") || combined.includes("sender") || combined.includes("5.7.60")) {
    return new HttpsError(
      "failed-precondition",
      "SMTP sender rejected. Ensure SMTP_FROM is a valid verified sender for this mailbox.",
    );
  }
  if (combined.includes("timeout") || combined.includes("etimedout") || combined.includes("econnreset")) {
    return new HttpsError("unavailable", "SMTP server timed out. Please retry.");
  }

  return new HttpsError("internal", "Could not send verification email.");
}

async function sendVerificationEmail({ to, code }) {
  const host = smtpHost.value();
  const port = Number.parseInt(String(smtpPort.value() || "587"), 10);
  const user = smtpUser.value();
  const pass = smtpPass.value();
  const from = smtpFrom.value();
  if (!host || !Number.isFinite(port) || !user || !pass || !from) {
    throw new HttpsError("failed-precondition", "SMTP secrets are not configured.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject: "Your SendQuote verification code",
    text: `Your SendQuote verification code is: ${code}

This code expires in 10 minutes.

If you did not request this code, you can ignore this email.`,
    html: `<p>Your SendQuote verification code is:</p>
<p style="font-size:24px;font-weight:700;letter-spacing:2px">${code}</p>
<p>This code expires in 10 minutes.</p>
<p>If you did not request this code, you can ignore this email.</p>`,
  });
}

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

exports.sendQuoteVerificationCode = onCall(
  {
    region: "us-central1",
    secrets: [smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, verificationPepper],
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    const email = String(request.data?.email || "").trim().toLowerCase();
    if (!validateEmailAddress(email)) {
      throw new HttpsError("invalid-argument", "A valid email is required.");
    }

    const db = admin.firestore();
    const now = Date.now();
    const cooldownRef = db.collection("quote_verification_cooldowns").doc(toSafeDocId(email));
    const cooldownSnap = await cooldownRef.get();
    const lastSentAtMs = Number(cooldownSnap.data()?.lastSentAtMs || 0);
    if (now - lastSentAtMs < VERIFICATION_RESEND_COOLDOWN_MS) {
      throw new HttpsError("resource-exhausted", "Please wait a minute before requesting another code.");
    }

    const code = makeVerificationCode();
    const challengeRef = db.collection("quote_verification_challenges").doc();
    await challengeRef.set({
      email,
      codeHash: hashVerificationCode(code, email),
      attempts: 0,
      maxAttempts: VERIFICATION_MAX_ATTEMPTS,
      consumed: false,
      createdAtMs: now,
      expiresAtMs: now + VERIFICATION_CODE_TTL_MS,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await cooldownRef.set(
      {
        email,
        lastSentAtMs: now,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    try {
      await sendVerificationEmail({ to: email, code });
    } catch (e) {
      await challengeRef.delete().catch(() => null);
      if (e instanceof HttpsError) throw e;
      console.error("SMTP send failed", {
        code: e?.code || null,
        command: e?.command || null,
        responseCode: e?.responseCode || null,
        response: e?.response || null,
        message: e?.message || null,
      });
      throw mapSmtpErrorToHttpsError(e);
    }

    return {
      challengeId: challengeRef.id,
      expiresInSec: Math.floor(VERIFICATION_CODE_TTL_MS / 1000),
    };
  },
);

/**
 * Checks whether an email address is already registered to a *different* user.
 * Requires the caller to be authenticated.
 *
 * Request data: { email: string }
 * Response:     { claimed: boolean }
 *
 * Uses the Admin SDK so it bypasses client-side email enumeration protection
 * and Firestore security rules that restrict cross-user reads.
 */
/**
 * Deletes all Firestore data belonging to the calling user then deletes their
 * Firebase Auth account.  Using the Admin SDK guarantees the deletes succeed
 * regardless of client-side security rules, and runs the whole operation
 * server-side so a flaky client can't leave orphaned documents behind.
 *
 * Collections cleaned up:
 *   users/{uid}
 *   quote_counters/{uid}
 *   quote_usage/{email}
 *   quotes  — all documents where userId == uid (batched)
 */
/**
 * Allows a customer (unauthenticated) to accept or decline a quote and
 * optionally leave a comment.  Runs with the Admin SDK so it bypasses the
 * Firestore security rule that restricts updates to the quote owner only.
 *
 * Safeguards:
 *   - Quote must exist and not be deleted.
 *   - Quote must still be in "pending" status (prevents double-response).
 *   - status must be "accepted" or "declined".
 *   - comment is optional, trimmed, and capped at 1000 characters.
 */
async function sendQuoteResponseNotification({ to, businessName, customerName, quoteNumber, status, comment, quoteUrl }) {
  const host = smtpHost.value();
  const port = Number.parseInt(String(smtpPort.value() || "587"), 10);
  const user = smtpUser.value();
  const pass = smtpPass.value();
  const from = smtpFrom.value();
  if (!host || !Number.isFinite(port) || !user || !pass || !from) {
    console.warn("SMTP secrets not configured — skipping quote response notification.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const statusWord = status === "accepted" ? "accepted" : "declined";
  const statusColor = status === "accepted" ? "#22C55E" : "#EF4444";
  const subject = `${customerName ?? "Your customer"} has ${statusWord} your quote`;

  const commentHtml = comment
    ? `<p style="margin:16px 0 0"><strong>Customer comment:</strong></p>
       <p style="margin:4px 0 0;font-style:italic;color:#555">"${comment}"</p>`
    : "";

  const commentText = comment ? `\n\nCustomer comment:\n"${comment}"` : "";

  await transporter.sendMail({
    from,
    to,
    subject,
    text: `Hi${businessName ? ` ${businessName}` : ""},\n\n${customerName ?? "Your customer"} has ${statusWord} quote QU-${quoteNumber}.${commentText}\n\nView the quote: ${quoteUrl}`,
    html: `<p>Hi${businessName ? ` <strong>${businessName}</strong>` : ""},</p>
<p><strong>${customerName ?? "Your customer"}</strong> has <strong style="color:${statusColor}">${statusWord}</strong> quote <strong>QU-${quoteNumber}</strong>.</p>
${commentHtml}
<p style="margin-top:20px"><a href="${quoteUrl}" style="background:${statusColor};color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">View quote</a></p>`,
  });
}

exports.submitQuoteResponse = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
    secrets: [smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom],
  },
  async (request) => {
    const quoteId = String(request.data?.quoteId ?? "").trim();
    const status  = String(request.data?.status  ?? "").trim();
    const comment = String(request.data?.comment ?? "").trim().slice(0, 1000);

    if (!quoteId) {
      throw new HttpsError("invalid-argument", "quoteId is required.");
    }
    if (status !== "accepted" && status !== "declined") {
      throw new HttpsError("invalid-argument", "status must be 'accepted' or 'declined'.");
    }

    const db  = admin.firestore();
    const ref = db.collection("quotes").doc(quoteId);
    const snap = await ref.get();

    if (!snap.exists) {
      throw new HttpsError("not-found", "Quote not found.");
    }
    const data = snap.data() || {};
    if (data.deleted) {
      throw new HttpsError("not-found", "Quote has been deleted.");
    }
    if (data.status !== "pending") {
      throw new HttpsError("failed-precondition", "This quote has already been responded to.");
    }

    await ref.update({
      status,
      comment: comment || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send email notification to the business owner (non-fatal if it fails).
    const businessEmail = data.businessEmail ?? "";
    if (businessEmail) {
      const quoteUrl = `https://sendquote.app/quote/${quoteId}`;
      sendQuoteResponseNotification({
        to: businessEmail,
        businessName: data.businessName ?? "",
        customerName: data.customerName ?? "Your customer",
        quoteNumber:  data.quoteNumber  ?? quoteId.slice(0, 6),
        status,
        comment,
        quoteUrl,
      }).catch((e) => console.error("Failed to send quote response notification", e));
    }

    return { ok: true };
  },
);

exports.deleteUserData = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const uid   = request.auth.uid;
    const db    = admin.firestore();
    const auth  = admin.auth();

    // Fetch the user record so we have the email for quote_usage cleanup.
    let email = "";
    try {
      const userRecord = await auth.getUser(uid);
      email = (userRecord.email ?? "").trim().toLowerCase();
    } catch (e) {
      // Non-fatal — continue without email-keyed deletions.
      console.warn("deleteUserData: could not fetch user record", e);
    }

    // Delete all quotes in batches of 500.
    const BATCH_LIMIT = 500;
    const quotesSnap = await db.collection("quotes").where("userId", "==", uid).get();
    for (let i = 0; i < quotesSnap.docs.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      quotesSnap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    // Delete remaining per-user documents.
    const toDelete = [
      db.collection("users").doc(uid),
      db.collection("quote_counters").doc(uid),
    ];
    if (email) toDelete.push(db.collection("quote_usage").doc(email));

    await Promise.all(toDelete.map((ref) => ref.delete()));

    // Finally remove the Auth account itself.
    await auth.deleteUser(uid);

    return { ok: true };
  },
);

exports.checkEmailAvailability = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const currentUid = request.auth.uid;
    const email = String(request.data?.email || "").trim().toLowerCase();
    if (!validateEmailAddress(email)) {
      throw new HttpsError("invalid-argument", "A valid email is required.");
    }

    const db = admin.firestore();

    // 1. Firebase Auth — direct lookup; immune to enumeration-protection.
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      if (userRecord.uid !== currentUid) {
        return { claimed: true };
      }
      // Email belongs to the calling user — not a conflict.
      return { claimed: false };
    } catch (e) {
      if (e.code !== "auth/user-not-found") {
        // Unexpected error — fail safe (let the save proceed; Firebase will
        // surface a duplicate error at the verifyBeforeUpdateEmail step).
        console.error("checkEmailAvailability auth lookup failed", e);
        return { claimed: false };
      }
      // auth/user-not-found → no Auth account with this email; still check Firestore.
    }

    // 2. Firestore — catch orphaned profile docs not yet cleaned up in Auth.
    try {
      const [snapBiz, snapLogin] = await Promise.all([
        db.collection("users").where("businessEmail", "==", email).limit(1).get(),
        db.collection("users").where("loginEmail",    "==", email).limit(1).get(),
      ]);
      const ids = new Set();
      snapBiz.forEach((d)  => ids.add(d.id));
      snapLogin.forEach((d) => ids.add(d.id));
      const claimed = [...ids].some((id) => id !== currentUid);
      return { claimed };
    } catch (e) {
      console.error("checkEmailAvailability firestore lookup failed", e);
      return { claimed: false };
    }
  },
);

exports.verifyQuoteVerificationCode = onCall(
  {
    region: "us-central1",
    secrets: [verificationPepper],
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    const challengeId = String(request.data?.challengeId || "").trim();
    const email = String(request.data?.email || "").trim().toLowerCase();
    const code = String(request.data?.code || "").trim();

    if (!challengeId || !validateEmailAddress(email) || !/^\d{6}$/.test(code)) {
      throw new HttpsError("invalid-argument", "Invalid verification payload.");
    }

    const db = admin.firestore();
    const ref = db.collection("quote_verification_challenges").doc(challengeId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Verification challenge not found.");
    }

    const challenge = snap.data() || {};
    if (challenge.email !== email) {
      throw new HttpsError("permission-denied", "Email does not match verification challenge.");
    }
    if (challenge.consumed) {
      throw new HttpsError("failed-precondition", "Verification code has already been used.");
    }
    if ((challenge.expiresAtMs || 0) < Date.now()) {
      throw new HttpsError("deadline-exceeded", "Verification code has expired.");
    }
    if ((challenge.attempts || 0) >= (challenge.maxAttempts || VERIFICATION_MAX_ATTEMPTS)) {
      throw new HttpsError("resource-exhausted", "Too many invalid attempts. Request a new code.");
    }

    const expectedHash = hashVerificationCode(code, email);
    if (expectedHash !== challenge.codeHash) {
      await ref.set({ attempts: admin.firestore.FieldValue.increment(1) }, { merge: true });
      throw new HttpsError("permission-denied", "Invalid verification code.");
    }

    await ref.set(
      {
        consumed: true,
        verifiedAtMs: Date.now(),
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true };
  },
);

/**
 * Extract quote data from a PDF using Claude.
 * Accepts a base64-encoded PDF and returns structured JSON.
 */
exports.extractQuoteFromPdf = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "512MiB",
    secrets: [anthropicApiKey],
  },
  async (request) => {
    const { pdfBase64 } = request.data ?? {};

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      throw new HttpsError("invalid-argument", "pdfBase64 is required.");
    }

    // Rough size guard: base64 of a 10 MB PDF ~= 13.3 MB string
    if (pdfBase64.length > 14_000_000) {
      throw new HttpsError("invalid-argument", "PDF is too large. Please use a file under 10 MB.");
    }

    const client = new Anthropic({ apiKey: anthropicApiKey.value() });

    const systemPrompt = `You are a data extraction assistant. Extract quote/invoice information from the provided PDF and return ONLY a raw JSON object. Do not include markdown, code fences, backticks, or any explanation — just the JSON object starting with { and ending with }.

Return this exact shape (use null for any field you cannot find):
{
  "businessName": string | null,
  "businessEmail": string | null,
  "customerName": string | null,
  "customerEmail": string | null,
  "currency": "GBP" | "USD" | "EUR" | "AUD" | "CAD" | null,
  "lineItems": [
    {
      "description": string,
      "quantity": number,
      "unitPrice": number,
      "vatRate": number
    }
  ]
}

Rules:
- lineItems must always be an array (empty array if none found)
- quantity defaults to 1 if not specified
- vatRate should be a percentage integer (e.g. 20 for 20%), default 20 if VAT is mentioned but rate unclear, 0 if no VAT
- unitPrice should be the per-unit price (not the line total)
- currency: infer from symbols (£=GBP, $=USD, €=EUR) or explicit labels
- Return null currency if ambiguous`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: "Extract the quote/invoice data from this PDF and return the JSON.",
            },
          ],
        },
      ],
    });

    const raw = response.content?.[0]?.text ?? "";

    // Strip markdown code fences if Claude wrapped the JSON (e.g. ```json ... ```)
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    // Extract the first {...} block in case Claude added surrounding commentary
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Claude raw output:", raw);
      throw new HttpsError("internal", "Claude returned non-JSON output. Please try again.");
    }

    // Sanitise line items
    if (!Array.isArray(parsed.lineItems)) parsed.lineItems = [];
    parsed.lineItems = parsed.lineItems.map((item) => ({
      description: String(item.description ?? ""),
      quantity:    Number(item.quantity)  || 1,
      unitPrice:   Number(item.unitPrice) || 0,
      vatRate:     Number(item.vatRate)   ?? 20,
    }));

    return { ok: true, data: parsed };
  },
);
