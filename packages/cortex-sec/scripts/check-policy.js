import fs from "node:fs";
import { z } from "zod";

const args = process.argv.slice(2);
const fileArg = args.find((a) => !a.startsWith("--"));
const file = fileArg || "reports/security.json";

const optionEntries = args
        .filter((a) => a.startsWith("--"))
        .map((a) => {
                const [key, value] = a.slice(2).split("=");
                return [key, value];
        });
const cliOptions = Object.fromEntries(optionEntries);

const thresholdSchema = z.object({
        high: z.coerce.number().int().nonnegative().default(0),
        medium: z.coerce.number().int().nonnegative().default(10),
        low: z.coerce.number().int().nonnegative().default(9999),
});

const thresholdsParsed = thresholdSchema.parse({
        high: cliOptions.high ?? process.env.POLICY_THRESHOLD_HIGH,
        medium: cliOptions.medium ?? process.env.POLICY_THRESHOLD_MEDIUM,
        low: cliOptions.low ?? process.env.POLICY_THRESHOLD_LOW,
});

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
                console.error(
                        `Error reading security report file: ${file}\n${err.message}`,
                );
        }
        process.exit(2);
}

const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
for (const f of json.findings ?? [])
        counts[f.severity] = (counts[f.severity] || 0) + 1;

const fail =
        counts.HIGH > thresholdsParsed.high ||
        counts.MEDIUM > thresholdsParsed.medium;

if (fail) {
        console.error("Policy failed:", counts);
        process.exit(1);
}
console.log("Policy passed:", counts);
