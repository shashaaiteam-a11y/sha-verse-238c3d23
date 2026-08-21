#!/usr/bin/env node
/**
 * verify-social-login.mjs
 *
 * Proves (or disproves) that @capgo/capacitor-social-login is actually
 * registered inside the generated Android project.
 *
 * Run on YOUR PC after:  npm install && npm run build && npx cap sync android
 *
 *   node scripts/verify-social-login.mjs
 *
 * Exit code 0 = plugin fully registered, native picker will work.
 * Exit code 1 = plugin missing; the printed reason tells you which step failed.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ok = (m) => console.log(`  \u2714 ${m}`);
const bad = (m) => console.log(`  \u2718 ${m}`);
let failures = 0;

function check(label, file, needle) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) {
    bad(`${label}: MISSING FILE ${file}`);
    failures++;
    return;
  }
  const txt = fs.readFileSync(p, "utf8");
  if (txt.includes(needle)) ok(`${label} (${file})`);
  else {
    bad(`${label}: "${needle}" not found in ${file}`);
    failures++;
  }
}

console.log("\nSHA-VERSE — SocialLogin native registration check\n");

// 0. dependency present
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const dep = pkg.dependencies?.["@capgo/capacitor-social-login"];
dep ? ok(`package.json dependency ${dep}`) : (bad("plugin not in package.json"), failures++);

if (!fs.existsSync(path.join(root, "node_modules/@capgo/capacitor-social-login/android"))) {
  bad("node_modules/@capgo/capacitor-social-login/android missing -> run `npm install`");
  failures++;
} else ok("plugin native sources present in node_modules");

// 1. web build must exist BEFORE cap sync, otherwise sync silently skips plugin generation
if (!fs.existsSync(path.join(root, "dist", "index.html"))) {
  bad("dist/index.html missing -> `npx cap sync` prints 'sync could not run--missing dist directory' and NEVER writes the plugin files. Run `npm run build` first.");
  failures++;
} else ok("dist/ web build exists (required before cap sync)");

// 2. android project exists
if (!fs.existsSync(path.join(root, "android"))) {
  bad("android/ folder missing -> run `npx cap add android`");
  failures++;
} else {
  ok("android/ project exists");
  check("Plugin listed for the Capacitor bridge", "android/app/src/main/assets/capacitor.plugins.json", "ee.forgr.capacitor.social.login.SocialLoginPlugin");
  check("Gradle module included", "android/capacitor.settings.gradle", "capgo-capacitor-social-login");
  check("Gradle dependency wired", "android/app/capacitor.build.gradle", "implementation project(':capgo-capacitor-social-login')");
  check("Web assets copied", "android/app/src/main/assets/capacitor.config.json", "appId");
}

console.log("");
if (failures === 0) {
  console.log("RESULT: SocialLogin IS registered. Rebuild the APK (uninstall old app first) and\n" +
    "Capacitor.isPluginAvailable('SocialLogin') must return true.\n");
  process.exit(0);
}
console.log(`RESULT: ${failures} problem(s). Fix them, then re-run:\n  npm install && npm run build && npx cap sync android && node scripts/verify-social-login.mjs\n`);
process.exit(1);
