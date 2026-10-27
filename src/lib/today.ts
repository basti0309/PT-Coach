import { env } from "@/lib/env";
import { todayIn } from "@/lib/format";

/** Heutiges Datum (YYYY-MM-DD) in der App-Zeitzone. */
export function appToday(): string {
  return todayIn(env.timeZone());
}
