// Test-environment guard: auth emails must never leave the machine during
// tests. Blank the key BEFORE any app module loads (dotenv never overrides
// an existing var), forcing lib/email.ts into its console-log fallback.
// Real delivery is covered by manual verification, not automated tests.
process.env.RESEND_API_KEY = "";

// Deterministic dummy storage credentials for the same reason: presigning
// is pure cryptography (no network), and every S3 call is intercepted by
// aws-sdk-client-mock — so tests never touch real R2/Supabase, whatever .env holds.
// STORAGE_DRIVER is pinned to r2 for determinism; suites covering the
// supabase driver switch it explicitly (plus __resetStorageForTests()).
process.env.STORAGE_DRIVER = "r2";
process.env.R2_ACCOUNT_ID = "test-account-id";
process.env.R2_ACCESS_KEY_ID = "test-access-key";
process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
process.env.R2_BUCKET = "test-bucket";
process.env.SUPABASE_S3_ENDPOINT = "https://test-ref.storage.supabase.co/storage/v1/s3";
process.env.SUPABASE_S3_REGION = "test-region";
process.env.SUPABASE_S3_ACCESS_KEY_ID = "test-supabase-key";
process.env.SUPABASE_S3_SECRET_ACCESS_KEY = "test-supabase-secret";
process.env.SUPABASE_S3_BUCKET = "test-supabase-bucket";
