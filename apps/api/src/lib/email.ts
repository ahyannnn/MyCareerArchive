import { Resend } from "resend";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  // Auth link (verification / reset). Logged in no-key mode so local dev
  // can click it; NEVER logged when actually sending.
  url?: string;
}

// Transactional sender for auth flows (verification, password reset).
// - Production/dev-with-key: sends through Resend.
// - Without RESEND_API_KEY (local dev, CI, tests): logs a structured record
//   instead of sending, so nothing hard-requires a key except real delivery.
// Callers must fire-and-forget (no await) to avoid login-timing attacks.
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ?? "MyCareerArchive <onboarding@resend.dev>";

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        event: "email.skipped",
        reason: "RESEND_API_KEY not set",
        from,
        to: payload.to,
        subject: payload.subject,
        ...(payload.url ? { url: payload.url } : {}),
      }),
    );
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
  if (error) {
    // Never throw into auth flows: a mail outage must not break login.
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ event: "email.failed", to: payload.to, error }));
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
