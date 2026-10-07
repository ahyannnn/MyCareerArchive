// Shared application error with an HTTP status + stable machine-readable code.
// All API failures use the envelope: { ok: false, error: CODE, message?, details? }
export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message?: string, details?: unknown) {
    super(message ?? code);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
