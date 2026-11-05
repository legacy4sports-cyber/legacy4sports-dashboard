/**
 * Render the dashboard from data/dashboard-data.json and encrypt it with StatiCrypt.
 *
 *   DASH_PASSWORD='...' node build/build.mjs
 *
 * The password is read from the environment and passed to StatiCrypt in the child
 * process environment. It is never written to disk by this script.
 */

import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { selfCheck } from "./self-check.mjs";
import { CATEGORIES, validateDashboardData } from "./schema.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataPath = join(root, "data", "dashboard-data.json");
const examplePath = join(root, "data", "dashboard-data.example.json");
const templatePath = join(root, "build", "dashboard.template.html");
const deadlinesPath = join(root, "build", "deadlines.mjs");
const passwordTemplatePath = join(root, "build", "password.template.html");
const stagingDir = join(root, ".build");
const plainPath = join(stagingDir, "index.html");
const encryptedPath = join(root, "index.html");
const staticryptCli = join(root, "node_modules", "staticrypt", "cli", "index.js");

function embedJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function browserSource(source) {
  return source.replace(/^export /gm, "");
}

function redact(text, password) {
  if (!password) return text;
  return text.split(password).join("[redacted]");
}

function runStaticrypt(password) {
  const args = [
    staticryptCli,
    plainPath,
    "--config",
    "false",
    "--directory",
    root,
    "--short",
    "--remember",
    "false",
    "--template",
    passwordTemplatePath,
    "--template-title",
    "Legacy4Sports",
    "--template-instructions",
    "This page is encrypted. Enter the password to open the finance dashboard.",
    "--template-button",
    "Unlock",
    "--template-placeholder",
    "Password",
    "--template-error",
    "Incorrect password.",
    "--template-color-primary",
    "#0e6b5c",
    "--template-color-secondary",
    "#f3efe6",
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: { ...process.env, STATICRYPT_PASSWORD: password },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let errorOutput = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      errorOutput += chunk;
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code !== 0) {
        const details = redact(`${errorOutput}\n${output}`.trim(), password) || `exit ${code}`;
        reject(new Error(`StatiCrypt failed.\n${details}`));
        return;
      }
      resolve();
    });
  });
}

function assertEncrypted(html, password) {
  const match = html.match(/"staticryptEncryptedMsgUniqueVariableName":"([0-9a-fA-F]+)"/);
  if (!match) throw new Error("Encrypted page is missing the StatiCrypt payload.");
  const shell = html.replace(match[1], "");
  const markers = [
    "No data yet",
    "Meals and entertainment",
    "Month to date",
    "taxSetAsideRate",
    "fiscalYearEnd",
    "2026-12-31",
    "dashboard-data",
    "Needs Review",
  ];
  for (const marker of markers) {
    if (shell.includes(marker)) {
      throw new Error(`Encrypted page leaked plaintext marker: ${marker}`);
    }
  }
  if (shell.includes(password)) {
    throw new Error("Encrypted page contains the password outside the ciphertext.");
  }
  if (!html.includes("staticrypt-password")) {
    throw new Error("Encrypted page is missing the password prompt.");
  }
}

async function main() {
  const password = process.env.DASH_PASSWORD;
  if (typeof password !== "string" || password.length === 0) {
    console.error("Set DASH_PASSWORD and run again: DASH_PASSWORD='...' node build/build.mjs");
    process.exit(1);
  }

  selfCheck();

  const example = validateDashboardData(JSON.parse(await readFile(examplePath, "utf8")));
  for (const row of [
    ...example.topVendors,
    ...example.topCustomers,
    ...example.receivables,
    ...example.needsReview,
    ...example.missingReceipts,
  ]) {
    const text = `${row.label || ""} ${row.reference || ""} ${row.description || ""}`;
    if (!text.includes("EXAMPLE")) {
      throw new Error("Example data must keep the EXAMPLE marker on every descriptive row.");
    }
  }

  let raw;
  try {
    raw = await readFile(dataPath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      console.error("Missing data/dashboard-data.json.");
      console.error("Copy data/dashboard-data.example.json and replace the placeholder figures.");
      console.error("That data file is gitignored. Do not commit it.");
      process.exit(1);
    }
    throw error;
  }

  const data = validateDashboardData(JSON.parse(raw));
  const template = await readFile(templatePath, "utf8");
  const deadlines = browserSource(await readFile(deadlinesPath, "utf8"));
  const replacements = [
    ["__DEADLINES_JS__", deadlines],
    ["__CATEGORIES_JSON__", embedJson(CATEGORIES)],
    ["__DASHBOARD_JSON__", embedJson(data)],
    ["__BUILT_AT__", new Date().toISOString()],
  ];
  let html = template;
  for (const [token, value] of replacements) {
    if (!html.includes(token)) throw new Error(`Template is missing ${token}`);
    html = html.replace(token, value);
  }
  if (html.includes("__DASHBOARD_JSON__") || html.includes("__DEADLINES_JS__")) {
    throw new Error("Template placeholders were not fully replaced.");
  }

  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(stagingDir, { recursive: true });
  try {
    await writeFile(plainPath, html);
    console.log("Encrypting dashboard with StatiCrypt.");
    await runStaticrypt(password);
    const encrypted = await readFile(encryptedPath, "utf8");
    assertEncrypted(encrypted, password);
    console.log("Wrote encrypted index.html");
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
