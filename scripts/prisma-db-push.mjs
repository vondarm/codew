#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const args = process.argv.slice(2);

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.length === 0) {
  console.warn('[build] Skipping "prisma db push" because DATABASE_URL is not set.');
  process.exit(0);
}

const requireFromHere = createRequire(import.meta.url);
const prismaCliPath = requireFromHere.resolve("prisma/build/index.js");

const child = spawn(process.execPath, [prismaCliPath, "db", "push", ...args], {
  stdio: "inherit",
  env: process.env,
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
