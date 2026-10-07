import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "./errors.js";

// S3-compatible evidence storage with two drivers: Cloudflare R2 and
// Supabase Storage (S3 protocol). Bytes NEVER flow through our servers:
// browsers PUT directly to presigned URLs, and Postgres stores only
// metadata (see Evidence model). Buckets stay private; reads go through
// short-lived presigned GETs.
//
// Both drivers speak S3, so the route layer (evidence.ts) is unchanged —
// only the endpoint/credentials differ. Supabase requires path-style URLs;
// R2 must NOT use path-style.
export const UPLOAD_URL_TTL_SECONDS = 900; // 15 min to start uploading
export const DOWNLOAD_URL_TTL_SECONDS = 3600; // 1 hour to fetch

export type StorageDriver = "r2" | "supabase";

export function maxEvidenceBytes(): number {
  const mb = Number(process.env.EVIDENCE_MAX_MB ?? 25);
  return (Number.isFinite(mb) && mb > 0 ? mb : 25) * 1024 * 1024;
}

// Explicit STORAGE_DRIVER wins. When unset, auto-detect: prefer whichever
// driver is fully configured (Supabase first so a migrated env with stale
// empty R2_* vars still works), falling back to "r2" for legacy errors.
export function activeDriver(): StorageDriver {
  const raw = (process.env.STORAGE_DRIVER ?? "").trim().toLowerCase();
  if (raw === "r2" || raw === "supabase") return raw;
  if (isSupabaseConfigured()) return "supabase";
  return "r2";
}

function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_S3_ENDPOINT &&
      process.env.SUPABASE_S3_REGION &&
      process.env.SUPABASE_S3_ACCESS_KEY_ID &&
      process.env.SUPABASE_S3_SECRET_ACCESS_KEY &&
      process.env.SUPABASE_S3_BUCKET,
  );
}

function bucket(): string {
  if (activeDriver() === "supabase") {
    const name = process.env.SUPABASE_S3_BUCKET;
    if (!name) {
      throw new AppError(
        503,
        "STORAGE_UNCONFIGURED",
        "Evidence storage is not configured (SUPABASE_S3_BUCKET missing)",
      );
    }
    return name;
  }
  const name = process.env.R2_BUCKET;
  if (!name) {
    throw new AppError(
      503,
      "STORAGE_UNCONFIGURED",
      "Evidence storage is not configured (R2_BUCKET missing)",
    );
  }
  return name;
}

let client: S3Client | null = null;
let cachedDriver: StorageDriver | null = null;

// Test-only: drop the cached client so env changes take effect between
// tests (e.g. the STORAGE_UNCONFIGURED case). Never used in production.
export function __resetStorageForTests(): void {
  client = null;
  cachedDriver = null;
}

function getR2Client(): S3Client {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET) {
    throw new AppError(
      503,
      "STORAGE_UNCONFIGURED",
      "Evidence storage is not configured (R2_* env vars missing)",
    );
  }
  return new S3Client({
    region: "auto", // required by the SDK, unused by R2
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}

function getSupabaseS3Client(): S3Client {
  const {
    SUPABASE_S3_ENDPOINT,
    SUPABASE_S3_REGION,
    SUPABASE_S3_ACCESS_KEY_ID,
    SUPABASE_S3_SECRET_ACCESS_KEY,
  } = process.env;
  if (
    !SUPABASE_S3_ENDPOINT ||
    !SUPABASE_S3_REGION ||
    !SUPABASE_S3_ACCESS_KEY_ID ||
    !SUPABASE_S3_SECRET_ACCESS_KEY ||
    !process.env.SUPABASE_S3_BUCKET
  ) {
    throw new AppError(
      503,
      "STORAGE_UNCONFIGURED",
      "Evidence storage is not configured (SUPABASE_S3_* env vars missing)",
    );
  }
  return new S3Client({
    region: SUPABASE_S3_REGION,
    // e.g. https://<ref>.storage.supabase.co/storage/v1/s3
    endpoint: SUPABASE_S3_ENDPOINT,
    forcePathStyle: true, // REQUIRED for Supabase S3; R2 must not set this
    credentials: {
      accessKeyId: SUPABASE_S3_ACCESS_KEY_ID,
      secretAccessKey: SUPABASE_S3_SECRET_ACCESS_KEY,
    },
  });
}

// Lazy singleton: created on first use so tests can mock the S3 prototype
// (aws-sdk-client-mock) regardless of import order. Recreated when the
// active driver changes (tests switch drivers via env + reset helper).
function getClient(): S3Client {
  const driver = activeDriver();
  if (client && cachedDriver === driver) return client;
  client = driver === "supabase" ? getSupabaseS3Client() : getR2Client();
  cachedDriver = driver;
  return client;
}

export function isStorageConfigured(): boolean {
  return activeDriver() === "supabase" ? isSupabaseConfigured() : isR2Configured();
}

// Object keys are namespaced per user so keys are never guessable across
// accounts: users/<userId>/evidence/<random>/<safe-file-name>
export function evidenceKey(userId: string, keyPart: string, fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "file";
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "file";
  return `users/${userId}/evidence/${keyPart}/${safe}`;
}

// Presigned PUT locked to the declared Content-Type: the S3-compatible
// backend rejects uploads whose Content-Type header doesn't match the signature.
export async function presignUpload(key: string, contentType: string): Promise<string> {
  const url = await getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );
  return url;
}

export async function presignDownload(key: string): Promise<string> {
  const url = await getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
  );
  return url;
}

// Verify an upload actually landed. Returns null when nothing is stored
// (abandoned or failed browser PUT); rethrows real storage errors.
export async function headObject(
  key: string,
): Promise<{ size: number; contentType?: string } | null> {
  try {
    const out = await getClient().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: out.ContentLength ?? 0, contentType: out.ContentType };
  } catch (err) {
    if (err instanceof Error && (err.name === "NotFound" || err.name === "NoSuchKey")) return null;
    throw err;
  }
}

// Delete is idempotent: a missing object is already the desired end state.
export async function deleteObject(key: string): Promise<void> {
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch (err) {
    if (err instanceof Error && (err.name === "NotFound" || err.name === "NoSuchKey")) return;
    throw err;
  }
}
