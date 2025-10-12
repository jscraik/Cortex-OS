// filename: scripts/time-freshness/check.js
import { DateTime } from "luxon"; // pnpm -w add luxon

const tz = process.env.USER_TIMEZONE || "America/Los_Angeles";
const todayEnv = process.env.TODAY; // optional ISO (yyyy-mm-dd)
const nowTz = DateTime.now().setZone(tz);
const today = todayEnv
  ? DateTime.fromISO(todayEnv, { zone: tz })
  : nowTz;

if (!today.isValid) {
  console.error(`TIME_FRESHNESS:FAIL tz=${tz} reason=invalid_today`);
  process.exit(1);
}
console.log(`TIME_FRESHNESS:OK tz=${tz} today=${today.toISODate()}`);