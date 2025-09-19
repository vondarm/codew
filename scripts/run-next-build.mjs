#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const env = { ...process.env };

const defaults = {
  GOOGLE_CLIENT_ID: "stub-google-client-id",
  GOOGLE_CLIENT_SECRET: "stub-google-client-secret",
  NEXTAUTH_SECRET: "stub-nextauth-secret",
};

for (const [key, fallback] of Object.entries(defaults)) {
  if (!env[key] || env[key].length === 0) {
    env[key] = fallback;
    if (process.env.CI !== "true") {
      console.warn(`[build] Using fallback value for ${key}.`);
    }
  }
}

const requireFromHere = createRequire(import.meta.url);
const nextCli = resolve(requireFromHere.resolve("next/package.json"), "../dist/bin/next");

const child = spawn(process.execPath, [nextCli, "build"], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
