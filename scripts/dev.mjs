// Dev supervisor: boots API + web together, restarts either on unexpected
// exit with capped backoff, and exits loudly (never silently) on persistent
// crashes or busy ports. Zero dependencies, Windows-safe.
//
//   npm run dev                 -> api :4000 + web :3000
//   npm run dev -- --api-only   -> api only
//   npm run dev -- --web-only   -> web only
//
// Busy ports are a hard error by design (warn-and-exit): auto-killing
// whatever holds your ports is how you lose someone else's work.

import { spawn } from "node:child_process";
import net from "node:net";

const API_PORT = Number(process.env.API_PORT ?? 4000);
const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);
// On Windows, npm is npm.cmd: only resolvable through the shell.
const SHELL = process.platform === "win32";

const BACKOFF_MS = [1000, 2000, 5000, 10000];
const MAX_RESTARTS_WINDOW_MS = 30_000;
const MAX_RESTARTS_IN_WINDOW = 5;

const args = new Set(process.argv.slice(2));
const wantApi = !args.has("--web-only");
const wantWeb = !args.has("--api-only");

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.end();
      resolve(true); // something is listening
    });
    socket.once("error", () => resolve(false));
  });
}

function prefix(tag, color) {
  const reset = "\x1b[0m";
  return `${color}[${tag}]${reset}`;
}

const COLORS = { api: "\x1b[36m", web: "\x1b[35m", dev: "\x1b[33m" };

function log(tag, ...parts) {
  // eslint-disable-next-line no-console
  console.log(prefix(tag, COLORS[tag] ?? COLORS.dev), ...parts);
}

let shuttingDown = false;
const children = new Map();

function runService(tag, npmArgs) {
  const state = { restarts: [], attempt: 0, child: null, stopped: false };

  function start() {
    if (shuttingDown || state.stopped) return;
    log(tag, `starting: npm ${npmArgs.join(" ")}`);
    const child = spawn("npm", npmArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
      shell: SHELL,
    });
    state.child = child;
    children.set(tag, child);

    child.stdout.on("data", (d) => process.stdout.write(`${prefix(tag, COLORS[tag])} ${d}`));
    child.stderr.on("data", (d) => process.stderr.write(`${prefix(tag, COLORS[tag])} ${d}`));

    child.on("exit", (code, signal) => {
      children.delete(tag);
      if (shuttingDown || state.stopped) return;
      // Clean exit (0 with no signal) means the user/script stopped it
      // deliberately — do not restart.
      if (code === 0 && signal === null) {
        log(tag, "exited cleanly; not restarting. Press Ctrl+C to stop the rest.");
        return;
      }
      const now = Date.now();
      state.restarts = state.restarts.filter((t) => now - t < MAX_RESTARTS_WINDOW_MS);
      state.restarts.push(now);
      if (state.restarts.length > MAX_RESTARTS_IN_WINDOW) {
        log(
          tag,
          `crashed ${state.restarts.length}x in 30s (last exit code=${code} signal=${signal}). ` +
            `Stopping auto-restart — fix the error above, then rerun npm run dev.`,
        );
        state.stopped = true;
        return;
      }
      const delay = BACKOFF_MS[Math.min(state.attempt, BACKOFF_MS.length - 1)];
      state.attempt += 1;
      log(tag, `crashed (code=${code} signal=${signal}); restarting in ${delay}ms…`);
      setTimeout(start, delay);
    });
  }

  start();
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("dev", `received ${signal}; stopping api + web…`);
  for (const [, child] of children) {
    try {
      child.kill("SIGINT");
    } catch {
      // already gone — nothing to stop
    }
  }
  // Give children a moment to exit cleanly, then force the issue.
  setTimeout(() => process.exit(0), 1500).unref();
}

async function main() {
  if (wantApi) {
    if (await checkPort(API_PORT)) {
      log("dev", `ERROR: port ${API_PORT} is already in use (is another API running?).`);
      log("dev", "Free the port or set API_PORT, then rerun npm run dev. Not starting anything.");
      process.exit(1);
    }
    runService("api", ["run", "dev", "--workspace=apps/api"]);
  }
  if (wantWeb) {
    if (await checkPort(WEB_PORT)) {
      log("dev", `ERROR: port ${WEB_PORT} is already in use (is another web server running?).`);
      log("dev", "Free the port or set WEB_PORT, then rerun npm run dev. Not starting anything.");
      process.exit(1);
    }
    runService("web", ["run", "dev", "--workspace=apps/web"]);
  }
  if (!wantApi && !wantWeb) {
    log("dev", "Nothing to run (--api-only and --web-only are mutually exclusive).");
    process.exit(2);
  }
  log("dev", "supervisor up. Ctrl+C stops everything.");
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  log("dev", `supervisor failed to start: ${err?.message ?? err}`);
  process.exit(1);
});
