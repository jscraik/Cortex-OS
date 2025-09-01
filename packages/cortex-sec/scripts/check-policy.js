import fs from "node:fs";

const file = process.argv[2] || "reports/security.json";
let json;
try {
  const data = fs.readFileSync(file, "utf8");
  json = JSON.parse(data);
} catch (err) {
  if (err.code === "ENOENT") {
    console.error(`Security report file not found: ${file}`);
  } else if (err instanceof SyntaxError) {
    console.error(`Malformed JSON in security report file: ${file}`);
  } else {
    console.error(`Error reading security report file: ${file}\n${err.message}`);
  }
  process.exit(2);
}
const thresholds = {
  HIGH: 0,
  MEDIUM: 10,
  LOW: 9999,
};

const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
for (const f of json.findings ?? []) counts[f.severity] = (counts[f.severity] || 0) + 1;

const fail = counts.HIGH > thresholds.HIGH || counts.MEDIUM > thresholds.MEDIUM;

if (fail) {
  console.error("Policy failed:", counts);
  process.exit(1);
}
console.log("Policy passed:", counts);
