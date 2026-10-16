import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { passwordResetEmail, sendEmail, verificationEmail } from "./email.js";
import { logger } from "./logger.js";

vi.mock("resend", () => ({ Resend: vi.fn() }));

async function resendMock() {
  const { Resend } = await import("resend");
  return Resend as unknown as Mock;
}

const savedKey = process.env.RESEND_API_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (savedKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = savedKey;
});

describe("sendEmail without a key", () => {
  it("logs a structured skip record instead of sending", async () => {
    delete process.env.RESEND_API_KEY;
    const info = vi.spyOn(logger, "info").mockImplementation(() => {});
    await sendEmail({
      to: "user@example.com",
      subject: "Verify",
      html: "<p>hi</p>",
      text: "hi",
      url: "https://app/verify?t=1",
    });
    expect(info).toHaveBeenCalledTimes(1);
    const [record] = info.mock.calls[0];
    expect(record).toMatchObject({
      event: "email.skipped",
      to: "user@example.com",
      subject: "Verify",
      url: "https://app/verify?t=1",
    });
  });

  it("omits the url field when there is no auth link", async () => {
    delete process.env.RESEND_API_KEY;
    const info = vi.spyOn(logger, "info").mockImplementation(() => {});
    await sendEmail({ to: "a@b.c", subject: "s", html: "h", text: "t" });
    const [record] = info.mock.calls[0];
    expect(record).not.toHaveProperty("url");
  });
});

describe("sendEmail with a key", () => {
  const payload = { to: "user@example.com", subject: "Hi", html: "<p>hi</p>", text: "hi" };

  it("sends through Resend without logging", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const send = vi.fn(async (..._args: unknown[]): Promise<{ error: { message: string } | null }> => ({ error: null }));
    (await resendMock()).mockImplementation(() => ({ emails: { send } }));
    const info = vi.spyOn(logger, "info").mockImplementation(() => {});
    await sendEmail(payload);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({ to: payload.to, subject: payload.subject });
    expect(info).not.toHaveBeenCalled();
  });

  it("logs email.failed without throwing when the provider errors", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const send = vi.fn(
      async (..._args: unknown[]): Promise<{ error: { message: string } | null }> => ({
        error: { message: "rejected" },
      }),
    );
    (await resendMock()).mockImplementation(() => ({ emails: { send } }));
    const err = vi.spyOn(logger, "error").mockImplementation(() => {});
    await expect(sendEmail(payload)).resolves.toBeUndefined();
    const [record] = err.mock.calls[0];
    expect(record).toMatchObject({ event: "email.failed", to: payload.to });
  });
});

describe("auth email templates", () => {
  it("embeds the action url in verification and reset emails", () => {
    const url = "https://app/reset?token=abc";
    const verify = verificationEmail(url);
    expect(verify.subject).toContain("Verify");
    expect(verify.html).toContain(url);
    expect(verify.text).toContain(url);
    const reset = passwordResetEmail(url);
    expect(reset.subject).toContain("Reset");
    expect(reset.html).toContain(url);
    expect(reset.text).toContain(url);
  });
});
