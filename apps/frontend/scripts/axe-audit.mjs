#!/usr/bin/env node
// AGENT_02 VALIDATE_A11Y — live axe-core audit against a real rendered build.
//
// This is the script AGENT_03's CI `a11y` step re-runs independently
// (§CI COVERAGE — FAIL CLOSED: it never trusts AGENT_02's self-report).
// No new dependency beyond what's already in package.json
// (playwright, @axe-core/playwright).
//
// SEVERITY THRESHOLD: fails the process (non-zero exit) on any axe
// violation with impact "serious" or "critical". "minor"/"moderate" are
// reported but non-blocking. Justification: serious/critical violations
// are the ones with a documented WCAG failure that blocks a real user
// (e.g. missing accessible name on an interactive control, insufficient
// contrast on required text) — treating those as CI-blocking matches this
// repo's own VALIDATE_A11Y gate ("no component ships without passing
// VALIDATE_A11Y"). minor/moderate findings are frequently
// judgment-call/cosmetic (e.g. redundant landmark roles) and would make
// the gate noisy enough to get disabled — better to surface them for a
// human to triage without hard-blocking every PR.
//
// DYNAMIC ROUTE FIXTURE: /projects/[projectId] has no seed/fixture
// mechanism today — there is no backend yet (apps/backend is a separate,
// not-yet-deployed agent's output), so this script does NOT fetch or seed
// real data. It navigates to a synthetic id
// (`axe-fixture-project-00000000`) and audits whatever the page renders
// for an unknown/unfetchable project: the loading state settling into the
// client-side error UI ("Failed to load tasks.", nav, empty kanban
// shell). This is explicitly a stub audit of the route's static/error-path
// markup, not a happy-path audit with real task data — logged plainly in
// this script's own output per the task's instruction not to silently
// skip it.

import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

const ROUTES = [
  { path: "/", label: "/ (projects dashboard)" },
  {
    path: "/projects/axe-fixture-project-00000000",
    label: "/projects/[projectId] (STUB — synthetic id, no backend/fixture exists; audits loading/error-path markup only)",
  },
  { path: "/users", label: "/users" },
];

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...opts });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // server not up yet
    }
    await sleep(300);
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

function formatViolation(v) {
  const nodes = v.nodes
    .slice(0, 5)
    .map((n) => `      - ${n.target.join(" ")}`)
    .join("\n");
  const more = v.nodes.length > 5 ? `\n      ...and ${v.nodes.length - 5} more` : "";
  return [
    `  [${v.impact ?? "unknown"}] ${v.id} — ${v.help}`,
    `    ${v.helpUrl}`,
    `    affected selectors:`,
    nodes + more,
  ].join("\n");
}

async function main() {
  console.log("VALIDATE_A11Y — building production bundle...");
  await run("npx", ["next", "build"], { cwd: process.cwd() });

  console.log(`VALIDATE_A11Y — starting production server on :${PORT}...`);
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  let exitCode = 0;

  try {
    await waitForServer(BASE_URL);

    const browser = await chromium.launch();
    const page = await browser.newPage();

    for (const route of ROUTES) {
      console.log(`\n=== Auditing ${route.label} ===`);
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "networkidle" });
      // Allow client-side data-fetch/error states and GSAP entrance
      // animations to settle before auditing the DOM.
      await page.waitForTimeout(750);

      const results = await new AxeBuilder({ page }).analyze();

      if (results.violations.length === 0) {
        console.log("  No violations found.");
        continue;
      }

      for (const v of results.violations) {
        console.log(formatViolation(v));
        if (BLOCKING_IMPACTS.has(v.impact)) {
          exitCode = 1;
        }
      }
    }

    await browser.close();
  } finally {
    server.kill("SIGTERM");
  }

  console.log(
    exitCode === 0
      ? "\nVALIDATE_A11Y: PASS (no serious/critical violations)"
      : "\nVALIDATE_A11Y: FAIL (serious/critical violation(s) found above)"
  );
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("VALIDATE_A11Y: script error —", err);
  process.exit(1);
});
