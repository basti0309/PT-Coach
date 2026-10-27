import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { planJsonSchema, PlanSchema } from "./schema";

describe("Plan-Schema", () => {
  it("docs/plan-schema.json entspricht dem Zod-Schema (sonst: npm run schema:generate)", () => {
    const file = JSON.parse(readFileSync("docs/plan-schema.json", "utf8"));
    expect(file).toEqual(JSON.parse(JSON.stringify(planJsonSchema())));
  });

  it("Beispielplan aus supabase/seed.sql ist gültig", () => {
    const seed = readFileSync("supabase/seed.sql", "utf8");
    const json = seed.split("$plan$")[1];
    const result = PlanSchema.safeParse(JSON.parse(json));
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });
});
