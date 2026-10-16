// docs:check — validates apps/api/openapi.yaml structurally:
// parses as YAML, asserts OpenAPI 3.x, and requires every path to carry at
// least one operation with responses. Run in CI (`npm run docs:check`).
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specFile = path.join(__dirname, "..", "openapi.yaml");

function fail(message) {
  console.error(`docs:check FAILED: ${message}`);
  process.exit(1);
}

let spec;
try {
  spec = parseYaml(readFileSync(specFile, "utf8"));
} catch (err) {
  fail(`unparseable YAML: ${String(err)}`);
}

if (!spec || typeof spec.openapi !== "string" || !spec.openapi.startsWith("3.")) {
  fail(`expected OpenAPI 3.x, got ${JSON.stringify(spec && spec.openapi)}`);
}

const paths = spec.paths || {};
const names = Object.keys(paths);
if (names.length < 27) {
  fail(`expected >= 27 paths, got ${names.length}`);
}

const methods = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);
let operations = 0;
for (const p of names) {
  const item = paths[p] || {};
  const ops = Object.keys(item).filter((k) => methods.has(k));
  if (ops.length === 0) fail(`path ${p} has no operations`);
  for (const op of ops) {
    operations += 1;
    const responses = item[op] && item[op].responses;
    if (!responses || Object.keys(responses).length === 0) {
      fail(`${op.toUpperCase()} ${p} has no responses`);
    }
  }
}

console.log(`docs:check OK: OpenAPI ${spec.openapi}, ${names.length} paths, ${operations} operations`);
if (operations < 35) {
  fail(`expected >= 35 operations, got ${operations}`);
}
