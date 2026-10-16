import { afterEach, describe, expect, it, vi } from "vitest";
import { parseSender, passwordResetEmail, sendEmail, verificationEmail } from "./email.js";
import { logger } from "./logger.js";

const savedKey = process.env.BREVO_API_KEY;
const savedFrom = process.env.EMAIL_FROM;

function mockFetchOk() {
  return vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 201, text: async () => "" }) as Response),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (savedKey === undefined) delete process.env.BREVO_API_KEY;
  else process.env.BREVO_API_KEY = savedKey;
  if (savedFrom === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = savedFrom;
});

describe("sendEmail without a key", () => {
  it("logs a structured skip record instead of sending", async () => {
    delete process.env.BREVO_API_KEY;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
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
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("omits the url field when there is no auth link", async () => {
    delete process.env.BREVO_API_KEY;
    vi.stubGlobal("fetch", vi.fn());
    const info = vi.spyOn(logger, "info").mockImplementation(() => {});
    await sendEmail({ to: "a@b.c", subject: "s", html: "h", text: "t" });
    const [record] = info.mock.calls[0];
    expect(record).not.toHaveProperty("url");
  });
});

describe("sendEmail with a key", () => {
  const payload = { to: "user@example.com", subject: "Hi", html: "<p>hi</p>", text: "hi" };

  it("sends through Brevo without logging", async () => {
    process.env.BREVO_API_KEY = "test-key";
    process.env.EMAIL_FROM = "MyCareerArchive <sender@example.com>";
    const fetchMock = vi.fn(
      async () => ({ ok: true, status: 201, text: async () => "" }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);
    const info = vi.spyOn(logger, "info").mockImplementation(() => {});
    await sendEmail(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((init.headers as Record<string, string>)["api-key"]).toBe("test-key");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      sender: { name: "MyCareerArchive", email: "sender@example.com" },
      to: [{ email: payload.to }],
      subject: payload.subject,
      htmlContent: payload.html,
      textContent: payload.text,
    });
    expect(info).not.toHaveBeenCalled();
  });

  it("logs email.failed without throwing when Brevo rejects", async () => {
    process.env.BREVO_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 400, text: async () => "bad sender" }) as Response),
    );
    const err = vi.spyOn(logger, "error").mockImplementation(() => {});
    await expect(sendEmail(payload)).resolves.toBeUndefined();
    const [record] = err.mock.calls[0];
    expect(record).toMatchObject({ event: "email.failed", to: payload.to, status: 400 });
  });

  it("logs email.failed without throwing when fetch throws", async () => {
    process.env.BREVO_API_KEY = "test-key";
    mockFetchOk();
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));
    const err = vi.spyOn(logger, "error").mockImplementation(() => {});
    await expect(sendEmail(payload)).resolves.toBeUndefined();
    const [record] = err.mock.calls[0];
    expect(record).toMatchObject({ event: "email.failed", to: payload.to });
  });
});

describe("parseSender", () => {
  it("splits Name <addr> and passes bare addresses through", () => {
    expect(parseSender("MyCareerArchive <sender@example.com>")).toEqual({
      name: "MyCareerArchive",
      email: "sender@example.com",
    });
    expect(parseSender("sender@example.com")).toEqual({ email: "sender@example.com" });
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
