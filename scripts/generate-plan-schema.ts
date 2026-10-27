// Erzeugt docs/plan-schema.json aus dem Zod-Schema (einzige Quelle der Wahrheit).
import { writeFileSync } from "node:fs";
import { planJsonSchema } from "../src/lib/plan/schema";

writeFileSync("docs/plan-schema.json", JSON.stringify(planJsonSchema(), null, 2) + "\n");
console.log("docs/plan-schema.json aktualisiert.");
