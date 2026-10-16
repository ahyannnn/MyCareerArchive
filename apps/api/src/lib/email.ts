import { logger } from "./logger.js";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  // Auth link (verification / reset). Logged in no-key mode so local dev
  // can click it; NEVER logged when actually sending.
  url?: string;
}

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// "Name <addr>" → Brevo { name, email }; bare "addr" → { email }.
export function parseSender(from: string): { name?: string; email: string } {
  const match = from.match(/^(.*)<([^<>]+)>\s*$/);
  if (match) {
    const name = match[1].trim().replace(/^["']|["']$/g, "");
    return name ? { name, email: match[2].trim() } : { email: match[2].trim() };
  }
  return { email: from.trim() };
}

// Transactional sender for auth flows (verification, password reset).
// - Production/dev-with-key: sends through Brevo (single-sender verification,
//   no custom domain required — verify one address via inbox code).
// - Without BREVO_API_KEY (local dev, CI, tests): logs a structured record
//   instead of sending, so nothing hard-requires a key except real delivery.
// Callers must fire-and-forget (no await) to avoid login-timing attacks.
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM ?? "MyCareerArchive <noreply@example.com>";

  if (!apiKey) {
    logger.info(
      {
        event: "email.skipped",
        reason: "BREVO_API_KEY not set",
        from,
        to: payload.to,
        subject: payload.subject,
        ...(payload.url ? { url: payload.url } : {}),
      },
      "email skipped (no key)",
    );
    return;
  }

  try {
    const sender = parseSender(from);
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: payload.to }],
        subject: payload.subject,
        htmlContent: payload.html,
        textContent: payload.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error(
        { event: "email.failed", to: payload.to, status: res.status, body: body.slice(0, 500) },
        "email delivery failed",
      );
    }
  } catch (error) {
    // Never throw into auth flows: a mail outage must not break login.
    logger.error({ event: "email.failed", to: payload.to, error }, "email delivery failed");
  }
}

export function verificationEmail(url: string): Pick<EmailPayload, "subject" | "html" | "text"> {
  return {
    subject: "Verify your MyCareerArchive email",
    html: `<p>Welcome to MyCareerArchive! Confirm your email address:</p><p><a href="${url}">Verify email</a></p><p>This link expires in 1 hour.</p>`,
    text: `Welcome to MyCareerArchive! Verify your email: ${url} (expires in 1 hour)`,
  };
}

export function passwordResetEmail(url: string): Pick<EmailPayload, "subject" | "html" | "text"> {
  return {
    subject: "Reset your MyCareerArchive password",
    html: `<p>Someone requested a password reset. If that was you:</p><p><a href="${url}">Reset password</a></p><p>This link expires in 1 hour. If it wasn't you, ignore this email.</p>`,
    text: `Reset your MyCareerArchive password: ${url} (expires in 1 hour). If it wasn't you, ignore this email.`,
  };
}
