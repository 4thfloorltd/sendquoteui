const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
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
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const stripePriceId = defineSecret("STRIPE_PRICE_ID");

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

  const safeCode = String(code).replace(/[^0-9]/g, "");
  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Your SendQuote verification code</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f0f4f8;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(8,58,107,0.08);">
        <tr>
          <td style="background-color:#083a6b;padding:24px 28px;border-radius:12px 12px 0 0;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">SendQuote</p>
            <p style="margin:6px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:500;color:rgba(255,255,255,0.85);">Email verification</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Your verification code</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#475569;">Enter this code to finish signing up or verifying your email. It is valid for <strong style="color:#0f172a;">10 minutes</strong>.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td align="center" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 16px;">
                  <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Code</p>
                  <p style="margin:0;font-family:ui-monospace,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace;font-size:32px;font-weight:700;letter-spacing:0.35em;color:#083a6b;line-height:1.2;">${safeCode}</p>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#64748b;">If you didn&rsquo;t request this code, you can safely ignore this email. Your account won&rsquo;t be changed.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
            <p style="margin:0;padding-top:20px;border-top:1px solid #f1f5f9;font-size:12px;line-height:1.5;color:#94a3b8;">This message was sent by SendQuote. Please don&rsquo;t share this code with anyone.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  await transporter.sendMail({
    from,
    to,
    subject: "Your SendQuote verification code",
    text: `Your SendQuote verification code is: ${safeCode}

This code expires in 10 minutes.

If you did not request this code, you can ignore this email.`,
    html: htmlBody,
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
async function sendQuoteResponseNotification({
  to, businessName, customerName, customerEmail,
  quoteNumber, quoteDate, currency, pricing, lineItems,
  status, comment, quoteUrl,
}) {
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

  const isAccepted = status === "accepted";
  const statusWord = isAccepted ? "Accepted" : "Declined";
  const statusColor = isAccepted ? "#16A34A" : "#DC2626";
  const statusBg = isAccepted ? "#F0FDF4" : "#FEF2F2";
  const subject = `Quote QU-${quoteNumber} has been ${statusWord.toLowerCase()} by ${customerName ?? "your customer"}`;

  // Currency symbol helper
  const symbols = { GBP: "£", USD: "$", EUR: "€", AUD: "A$", CAD: "C$" };
  const sym = symbols[currency] ?? "";
  const fmt = (n) => `${sym}${Number(n ?? 0).toFixed(2)}`;

  // Line items table rows
  const lineItemRows = Array.isArray(lineItems) && lineItems.length > 0
    ? lineItems.map((item) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const vatPct = Number(item.vatPercent ?? item.vatRate ?? 0);
      const lineNet = qty * price;
      return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #F1F5F9;font-size:13px;color:#374151">${item.description ?? ""}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #F1F5F9;font-size:13px;color:#374151;text-align:center">${qty}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #F1F5F9;font-size:13px;color:#374151;text-align:right">${fmt(price)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #F1F5F9;font-size:13px;color:#374151;text-align:right">${vatPct}%</td>
          <td style="padding:8px 12px;border-bottom:1px solid #F1F5F9;font-size:13px;color:#374151;text-align:right;font-weight:600">${fmt(lineNet)}</td>
        </tr>`;
    }).join("")
    : "";

  const lineItemsTable = lineItemRows ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:20px;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">
      <thead>
        <tr style="background:#F8FAFC">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em">Description</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em">Unit price</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em">VAT</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em">Total</th>
        </tr>
      </thead>
      <tbody>${lineItemRows}</tbody>
    </table>` : "";

  const totalsSection = pricing ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
      <tr>
        <td style="padding:4px 12px;font-size:13px;color:#6B7280;text-align:right">Subtotal</td>
        <td style="padding:4px 12px;font-size:13px;color:#374151;text-align:right;width:100px">${fmt(pricing.subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:4px 12px;font-size:13px;color:#6B7280;text-align:right">VAT</td>
        <td style="padding:4px 12px;font-size:13px;color:#374151;text-align:right">${fmt(pricing.tax)}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;font-size:15px;font-weight:700;color:#083a6b;text-align:right;border-top:2px solid #E5E7EB">Total</td>
        <td style="padding:6px 12px;font-size:15px;font-weight:700;color:#083a6b;text-align:right;border-top:2px solid #E5E7EB">${fmt(pricing.total)}</td>
      </tr>
    </table>` : "";

  const commentSection = comment ? `
    <div style="margin-top:24px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:16px">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.05em">Customer comment</p>
      <p style="margin:0;font-size:14px;color:#374151;font-style:italic">&ldquo;${comment}&rdquo;</p>
    </div>` : "";

  const quoteDetailsRow = (label, value) =>
    `<tr><td style="padding:5px 0;font-size:13px;color:#6B7280;width:130px">${label}</td><td style="padding:5px 0;font-size:13px;color:#111827;font-weight:600">${value}</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

        <!-- Header -->
        <tr><td style="background:#083a6b;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center">
          <p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:0.02em">SendQuote</p>
        </td></tr>

        <!-- Status banner -->
        <tr><td style="background:${statusBg};padding:20px 32px;text-align:center;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB">
          <p style="margin:0 0 4px;font-size:26px;font-weight:800;color:${statusColor}">${statusWord}</p>
          <p style="margin:0;font-size:15px;color:#374151">
            <strong>${customerName ?? "Your customer"}</strong> has ${statusWord.toLowerCase()} quote <strong>QU-${quoteNumber}</strong>
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:28px 32px;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB">

          <p style="margin:0 0 20px;font-size:15px;color:#374151">
            Hi${businessName ? ` <strong>${businessName}</strong>` : ""},<br><br>
            This is a notification that your customer has responded to the quote below.
          </p>

          <!-- Quote details -->
          <table cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;padding:16px;background:#F8FAFC;width:100%;box-sizing:border-box">
            <tbody>
              ${quoteDetailsRow("Quote number", `QU-${quoteNumber}`)}
              ${customerName ? quoteDetailsRow("Customer", customerName) : ""}
              ${customerEmail ? quoteDetailsRow("Email", customerEmail) : ""}
              ${quoteDate ? quoteDetailsRow("Quote date", quoteDate) : ""}
              ${currency ? quoteDetailsRow("Currency", currency) : ""}
            </tbody>
          </table>

          ${lineItemsTable}
          ${totalsSection}
          ${commentSection}

          <!-- CTA -->
          <div style="text-align:center;margin-top:32px">
            <a href="${quoteUrl}"
               style="display:inline-block;background:#083a6b;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;letter-spacing:0.01em">
              View quote →
            </a>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F8FAFC;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center">
          <p style="margin:0;font-size:12px;color:#9CA3AF">
            This email was sent by <strong>SendQuote</strong> on behalf of ${businessName || "your business"}.<br>
            <a href="${quoteUrl}" style="color:#083a6b;text-decoration:none">View quote online</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `SendQuote - Quote ${statusWord.toUpperCase()}`,
    ``,
    `Hi${businessName ? ` ${businessName}` : ""},`,
    ``,
    `${customerName ?? "Your customer"} has ${statusWord.toLowerCase()} quote QU-${quoteNumber}.`,
    customerEmail ? `Customer email: ${customerEmail}` : "",
    quoteDate ? `Quote date: ${quoteDate}` : "",
    pricing ? `Total: ${fmt(pricing.total)}` : "",
    comment ? `\nCustomer comment:\n"${comment}"` : "",
    ``,
    `View the quote: ${quoteUrl}`,
  ].filter(Boolean).join("\n");

  await transporter.sendMail({ from, to, subject, text, html });
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
    const status = String(request.data?.status ?? "").trim();
    const comment = String(request.data?.comment ?? "").trim().slice(0, 1000);

    if (!quoteId) {
      throw new HttpsError("invalid-argument", "quoteId is required.");
    }
    if (status !== "accepted" && status !== "declined") {
      throw new HttpsError("invalid-argument", "status must be 'accepted' or 'declined'.");
    }

    const db = admin.firestore();
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
      const quoteUrl = `https://sendquote.ai/quote/${quoteId}`;
      sendQuoteResponseNotification({
        to: businessEmail,
        businessName: data.businessName ?? "",
        customerName: data.customerName ?? "Your customer",
        customerEmail: data.customerEmail ?? "",
        quoteNumber: data.quoteNumber ?? quoteId.slice(0, 6),
        quoteDate: data.quoteDate ?? "",
        currency: data.currency ?? "GBP",
        pricing: data.pricing ?? null,
        lineItems: data.lineItems ?? [],
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

    const uid = request.auth.uid;
    const db = admin.firestore();
    const auth = admin.auth();

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

// Lightweight guest-safe check: returns { registered: true } if an Auth
// account exists for the given email. No authentication required — the
// response only confirms presence, not identity, so enumeration risk is
// equivalent to the standard registration flow.
exports.checkEmailRegistered = onCall(
  { region: "us-central1", timeoutSeconds: 15, memory: "256MiB" },
  async (request) => {
    const email = String(request.data?.email || "").trim().toLowerCase();
    if (!validateEmailAddress(email)) {
      throw new HttpsError("invalid-argument", "A valid email is required.");
    }
    try {
      await admin.auth().getUserByEmail(email);
      return { registered: true };
    } catch (e) {
      if (e.code === "auth/user-not-found") return { registered: false };
      console.error("checkEmailRegistered error", e);
      return { registered: false };
    }
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
        db.collection("users").where("loginEmail", "==", email).limit(1).get(),
      ]);
      const ids = new Set();
      snapBiz.forEach((d) => ids.add(d.id));
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
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      vatRate: Number(item.vatRate) ?? 20,
    }));

    return { ok: true, data: parsed };
  },
);

// ─── Stripe: create Subscription + return PaymentIntent client_secret ─────────
exports.createSubscriptionIntent = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
    secrets: [stripeSecretKey, stripePriceId],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }
    const uid = request.auth.uid;
    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};

    const stripe = require("stripe")(stripeSecretKey.value());

    // Reuse or create Stripe customer.
    let customerId = userData.stripeCustomerId || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: request.auth.token.email || userData.bizEmail || undefined,
        metadata: { firebaseUid: uid },
      });
      customerId = customer.id;
      await userRef.set({ stripeCustomerId: customerId }, { merge: true });
    }

    // Cancel any existing incomplete subscriptions to avoid duplicates.
    const existing = await stripe.subscriptions.list({
      customer: customerId,
      status: "incomplete",
      limit: 5,
    });
    await Promise.all(
      existing.data.map((s) => stripe.subscriptions.cancel(s.id).catch(() => { })),
    );

    // Create subscription without nested expand — we'll fetch the invoice separately.
    // Restrict to 'card' only (covers regular cards, Apple Pay, Google Pay) via
    // payment_settings.payment_method_types, which excludes Link, Klarna, Revolut Pay, etc.
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: stripePriceId.value() }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card"],
      },
      metadata: { firebaseUid: uid },
    });

    console.log("Subscription created:", subscription.id, "status:", subscription.status);

    // Get the invoice ID from the subscription.
    const invoiceId = typeof subscription.latest_invoice === "string"
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id;

    if (!invoiceId) {
      throw new HttpsError("internal", "No invoice found on subscription.");
    }

    // Fetch the invoice with payments expanded (Stripe 2026-03-25.dahlia).
    // In this API version invoice.payment_intent is gone; the PI id lives in
    // invoice.payments.data[0].payment_intent (a string — NOT further expandable).
    const invoice = await stripe.invoices.retrieve(invoiceId, {
      expand: ["payment_intent", "payments"],
    });

    console.log("Invoice keys:", Object.keys(invoice).join(", "));
    console.log("Invoice payment_intent field:", invoice.payment_intent, "| payments count:", invoice.payments?.data?.length);

    let paymentIntent = null;

    // 1) Legacy path: invoice.payment_intent directly (pre-2024-09-30)
    const legacyPi = invoice.payment_intent;
    if (legacyPi && typeof legacyPi === "object") {
      paymentIntent = legacyPi;
    } else if (typeof legacyPi === "string") {
      paymentIntent = await stripe.paymentIntents.retrieve(legacyPi);
    }

    // 2) New path: invoice.payments.data[0].payment_intent (2024-09-30 / dahlia)
    //    The PI is returned as a string id — retrieve it separately.
    if (!paymentIntent) {
      const piId = invoice.payments?.data?.[0]?.payment_intent;
      console.log("payments[0].payment_intent:", piId);
      if (piId && typeof piId === "string") {
        paymentIntent = await stripe.paymentIntents.retrieve(piId);
      } else if (piId && typeof piId === "object") {
        paymentIntent = piId;
      }
    }

    // 3) Absolute fallback: list PIs for the customer
    if (!paymentIntent) {
      const list = await stripe.paymentIntents.list({ customer: customerId, limit: 5 });
      paymentIntent = list.data.find(
        (pi) => pi.status === "requires_payment_method" || pi.status === "requires_confirmation",
      ) || null;
      if (paymentIntent) console.log("Found PI via list fallback:", paymentIntent.id);
    }

    console.log("PaymentIntent id:", paymentIntent?.id, "client_secret present:", !!paymentIntent?.client_secret);

    if (!paymentIntent?.client_secret) {
      throw new HttpsError("internal", "Could not create payment intent. Please try again.");
    }

    // Store the subscription ID so the webhook can look up the user.
    await userRef.set({ stripeSubscriptionId: subscription.id }, { merge: true });

    return {
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    };
  },
);

// ─── Stripe: create Checkout session (hosted page) ────────────────────────────
exports.createCheckoutSession = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
    secrets: [stripeSecretKey, stripePriceId],
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
    const uid = request.auth.uid;
    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};

    const stripe = require("stripe")(stripeSecretKey.value());
    let customerId = userData.stripeCustomerId || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: request.auth.token.email || userData.bizEmail || undefined,
        metadata: { firebaseUid: uid },
      });
      customerId = customer.id;
      await userRef.set({ stripeCustomerId: customerId }, { merge: true });
    }

    const appUrl = "https://sendquote.ai";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: uid,
      mode: "subscription",
      line_items: [{ price: stripePriceId.value(), quantity: 1 }],
      success_url: `${appUrl}/secured/billing?checkout=success`,
      cancel_url: `${appUrl}/secured/billing?checkout=cancel`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      subscription_data: { metadata: { firebaseUid: uid } },
    });
    return { url: session.url };
  },
);

// ─── Stripe: create Customer Portal session ───────────────────────────────────
exports.createPortalSession = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
    secrets: [stripeSecretKey],
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
    const uid = request.auth.uid;
    const userSnap = await admin.firestore().collection("users").doc(uid).get();
    const customerId = (userSnap.data() || {}).stripeCustomerId;
    if (!customerId) throw new HttpsError("not-found", "No billing account found. Please upgrade first.");

    const stripe = require("stripe")(stripeSecretKey.value());
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: "https://sendquote.ai/secured/billing",
    });
    return { url: session.url };
  },
);

// ─── Stripe: webhook handler ───────────────────────────────────────────────────
exports.stripeWebhook = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB",
    secrets: [stripeSecretKey, stripeWebhookSecret],
  },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

    const stripe = require("stripe")(stripeSecretKey.value());
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value());
    } catch (err) {
      console.error("Stripe webhook signature error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    const db = admin.firestore();

    async function refByCustomerId(customerId) {
      const snap = await db.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get();
      return snap.empty ? null : snap.docs[0].ref;
    }

    async function refBySubscriptionId(subscriptionId) {
      const snap = await db.collection("users").where("stripeSubscriptionId", "==", subscriptionId).limit(1).get();
      return snap.empty ? null : snap.docs[0].ref;
    }

    try {
      switch (event.type) {

        // ── Hosted Checkout completed ──────────────────────────────────────
        case "checkout.session.completed": {
          const session = event.data.object;
          const uid = session.client_reference_id;
          if (!uid) break;
          await db.collection("users").doc(uid).set({
            plan: "premium",
            planStatus: "active",
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            planUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          break;
        }

        // ── Invoice paid (covers both Checkout and Elements first payment) ─
        case "invoice.payment_succeeded": {
          const invoice = event.data.object;
          // Look up user via subscriptionId (set before payment in Elements flow)
          // or fall back to customerId.
          let ref = invoice.subscription
            ? await refBySubscriptionId(invoice.subscription)
            : null;
          if (!ref) ref = await refByCustomerId(invoice.customer);
          if (!ref) break;
          await ref.set({
            plan: "premium",
            planStatus: "active",
            planUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          break;
        }

        // ── Subscription changed ───────────────────────────────────────────
        case "customer.subscription.updated": {
          const sub = event.data.object;
          const ref = await refByCustomerId(sub.customer);
          if (!ref) break;
          const active = sub.status === "active" || sub.status === "trialing";
          await ref.set({
            plan: active ? "premium" : "free",
            planStatus: sub.status,
            planPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000) : null,
            stripeSubscriptionId: sub.id,
            planUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          break;
        }

        // ── Subscription cancelled ─────────────────────────────────────────
        case "customer.subscription.deleted": {
          const sub = event.data.object;
          const ref = await refByCustomerId(sub.customer);
          if (!ref) break;
          await ref.set({
            plan: "free",
            planStatus: "canceled",
            planPeriodEnd: null,
            planUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          break;
        }

        // ── Payment failed ─────────────────────────────────────────────────
        case "invoice.payment_failed": {
          const invoice = event.data.object;
          const ref = await refByCustomerId(invoice.customer);
          if (!ref) break;
          await ref.set({
            planStatus: "past_due",
            planUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          break;
        }

        default: break;
      }
    } catch (err) {
      console.error("Error processing Stripe webhook:", event.type, err);
      res.status(500).send("Internal error");
      return;
    }

    res.status(200).json({ received: true });
  },
);

/**
 * Persists a bug report to Firestore and emails support@sendquote.ai.
 *
 * Request data:
 *   description  – string (required)
 *   screenshotUrl – string | null — download URL from Firebase Storage (optional)
 *   screenshotName – string | null
 *
 * Response: { reportId: string }
 */
exports.submitBugReport = onCall(
  {
    region: "us-central1",
    secrets: [smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom],
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to submit a bug report.");
    }

    const uid = request.auth.uid;
    const description = String(request.data?.description ?? "").trim();
    const screenshotPath = request.data?.screenshotPath ?? null;
    const screenshotName = request.data?.screenshotName ?? null;

    if (!description) {
      throw new HttpsError("invalid-argument", "Description is required.");
    }

    // Look up the reporter's email from Auth.
    let reporterEmail = "";
    try {
      const userRecord = await admin.auth().getUser(uid);
      reporterEmail = userRecord.email ?? "";
    } catch (_) { }

    // Build a download URL using the Firebase download token embedded in the
    // file's metadata — no IAM signBlob permission required.
    let screenshotSignedUrl = null;
    if (screenshotPath) {
      try {
        const bucket = admin.storage().bucket("sendquote-c823c.firebasestorage.app");
        const file = bucket.file(screenshotPath);
        const [metadata] = await file.getMetadata();
        const token = metadata.metadata?.firebaseStorageDownloadTokens;
        if (token) {
          screenshotSignedUrl =
            `https://firebasestorage.googleapis.com/v0/b/sendquote-c823c.firebasestorage.app/o/` +
            `${encodeURIComponent(screenshotPath)}?alt=media&token=${token}`;
        } else {
          console.warn("submitBugReport: no download token on file metadata");
        }
      } catch (e) {
        console.warn("submitBugReport: could not build screenshot URL (non-fatal)", e?.message);
      }
    }

    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const docRef = await db.collection("bug_reports").add({
      uid,
      email: reporterEmail,
      description,
      screenshotPath: screenshotPath ?? null,
      screenshotName: screenshotName ?? null,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });

    // Best-effort email to support — never fail the whole request if SMTP is down.
    try {
      const host = smtpHost.value();
      const port = Number.parseInt(String(smtpPort.value() || "587"), 10);
      const user = smtpUser.value();
      const pass = smtpPass.value();
      const from = smtpFrom.value();

      if (host && Number.isFinite(port) && user && pass && from) {
        const transporter = nodemailer.createTransport({
          host, port, secure: port === 465, auth: { user, pass },
        });

        await transporter.sendMail({
          from,
          to: from,
          subject: `[Bug Report] from ${reporterEmail || uid}`,
          text: [
            `Reporter: ${reporterEmail || uid}`,
            `Report ID: ${docRef.id}`,
            ``,
            description,
            screenshotSignedUrl ? `\nScreenshot: ${screenshotSignedUrl}` : "",
          ].join("\n"),
          html: `
            <p><strong>Reporter:</strong> ${reporterEmail || uid}</p>
            <p><strong>Report ID:</strong> ${docRef.id}</p>
            <hr/>
            <p style="white-space:pre-wrap">${description.replace(/</g, "&lt;")}</p>
            ${screenshotSignedUrl ? `
            <p><strong>Screenshot:</strong></p>
            <p>
              <a href="${screenshotSignedUrl}">
                <img src="${screenshotSignedUrl}" alt="Bug screenshot"
                  style="max-width:100%;max-height:600px;border:1px solid #ddd;border-radius:4px;" />
              </a>
            </p>
            <p style="font-size:12px;color:#888;">Image link expires in 7 days.</p>
            ` : ""}
          `,
        });
      }
    } catch (emailErr) {
      console.warn("submitBugReport: email notify failed (non-fatal)", emailErr?.message);
    }

    return { reportId: docRef.id };
  },
);
