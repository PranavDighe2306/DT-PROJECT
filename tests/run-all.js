// Runs every tests/*.test.js in its own process and prints a summary. Usage: npm test
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const files = fs.readdirSync(__dirname).filter(f => f.endsWith(".test.js")).sort();
const verbose = process.argv.includes("--verbose");
let failed = 0;
files.forEach(f => {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding:"utf8", timeout:120000 });
  const out = (r.stdout || "") + (r.stderr || ""), checks = (out.match(/^ok /gm) || []).length, bad = out.split("\n").filter(l => l.startsWith("FAIL"));
  const pass = r.status === 0 && !bad.length;
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${f.padEnd(40)} ${checks} checks${pass ? "" : ` (${bad.length} failed)`}`);
  if (!pass || verbose) console.log(out.split("\n").filter(l => verbose || !l.startsWith("ok")).map(l => "      " + l).join("\n"));
});
console.log(failed ? `\n${failed} of ${files.length} test files failed.` : `\nAll ${files.length} test files passed.`);
process.exit(failed ? 1 : 0);
