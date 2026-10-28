// Erzeugt docs/TESTPROFILE.md aus denselben Funktionen, die die App nutzt (src/lib/plan/derive.ts).
// Aufruf: npm run testprofile:generate
import { writeFileSync } from "node:fs";
import { mifflinStJeor } from "../src/lib/calc/calories";
import { HYROX_STANDARDS } from "../src/lib/calc/hyrox";
import { derivePaces, formatPace } from "../src/lib/calc/paces";
import { formatDuration, formatNumber } from "../src/lib/format";
import { deriveAll, type Derived } from "../src/lib/plan/derive";
import { TESTPROFILES, TESTPROFILE_TODAY } from "../src/lib/plan/testprofile-fixtures";

const VARIANT = { max: "maximal", submax: "submaximal", entfaellt: "entfällt" } as const;
const LIFT = { squat: "Kniebeuge", bench: "Bankdrücken", deadlift: "Kreuzheben" } as const;
const steps = (xs: string[]) => xs.map((s) => `   - ${s}`).join("\n");

function render(d: Derived): string {
  const out: string[] = [];
  out.push(`**R1 Einstufung:** ${d.tier ? `Tier ${d.tier.tier}${d.tier.tier3Possible ? " (Tier 3+ möglich)" : ""}` : "nicht ableitbar"}`);
  if (d.tier) out.push(steps(d.tier.steps));
  if (d.startVolume) {
    out.push(
      `**R2 Startumfang:** ${formatNumber(d.startVolume.sessionsPerWeek)} Einheiten, ${d.startVolume.enduranceMinutes} min Ausdauer, ${formatNumber(d.startVolume.runKm)} km, ${formatNumber(d.startVolume.strengthSessions)} × Kraft pro Woche`,
    );
    out.push(steps(d.startVolume.steps));
  }
  out.push(`**R3 Screening:** Testwoche ${d.screening.testWeekAllowed ? "erlaubt" : "gesperrt"}, Maximaltests ${d.screening.maxTestsAllowed ? "erlaubt" : "nicht erlaubt"}`);
  out.push(steps(d.screening.steps));
  out.push(`**R4 Testwoche:** ${d.testWeek.allowed ? "" : "keine"}`);
  out.push(steps(d.testWeek.steps));
  if (d.testWeek.tests.length) {
    out.push("", "| Test | Variante | Ablauf | Grund |", "|---|---|---|---|");
    for (const t of d.testWeek.tests) out.push(`| ${t.label} | ${VARIANT[t.variant]} | ${t.protocol || "–"} | ${t.reason} |`);
    out.push("");
  }
  out.push("**R5/R6 Kraft:**");
  for (const l of d.strength.lifts) {
    out.push(
      l.e1rmKg != null
        ? `- ${LIFT[l.lift]}: e1RM ${formatNumber(l.e1rmKg)} kg; ${l.loads.map((x) => `${x.label} = ${formatNumber(x.kg)} kg`).join("; ")}`
        : `- ${l.steps.at(-1)}`,
    );
    if (l.e1rmKg != null) out.push(steps(l.steps));
  }
  if (d.paces) {
    out.push("**R7 Paces (Riegel 1981):**", "", "| Strecke | Zeit | Pace | im Gültigkeitsbereich |", "|---|---|---|---|");
    for (const r of d.paces.races) out.push(`| ${r.label} | ${formatDuration(r.seconds)} | ${formatPace(r.paceSecPerKm)} | ${r.inRange ? "ja" : "**nein**"} |`);
    out.push("", "| Trainings-Pace | Bereich | Einheit „pro Meile“ angenommen |", "|---|---|---|");
    for (const t of d.paces.training)
      out.push(
        `| ${t.label} | ${t.fastSecPerKm === t.slowSecPerKm ? formatPace(t.fastSecPerKm) : `${formatPace(t.fastSecPerKm)} – ${formatPace(t.slowSecPerKm)}`} | ${t.unitAssumed ? "ja" : "nein"} |`,
      );
    if (d.paces.hyroxRacePaceSecPerKm != null) out.push(`| Hyrox-Renn-Pace | ${formatPace(d.paces.hyroxRacePaceSecPerKm)} | – |`);
    out.push("", steps(d.paces.steps));
  } else out.push("**R7 Paces:** keine Laufleistung als Referenz → nicht ableitbar.");
  if (d.hyrox) {
    const s = d.hyrox.standards;
    out.push(
      `**R8 Hyrox (${d.hyrox.division}):** Sled Push ${s.sledPushKg} kg, Sled Pull ${s.sledPullKg} kg, Farmers 2 × ${s.farmersKgEach} kg, Sandsack ${s.sandbagKg} kg, Wall Ball ${s.wallBallKg} kg auf ${s.wallBallTargetM} m`,
    );
  }
  out.push(`**R9 Herzfrequenz:** ${d.heartRate ? d.heartRate.zones.map((z) => `${z.percent} % = ${z.bpm}`).join(", ") : "keine gemessene HFmax → HF-Angaben der Vorlagen werden nicht in Schläge umgerechnet."}`);
  out.push(
    `**R10 Kalorien:** ${d.calories ? `${d.calories.totalKcal} kcal/Tag (Grundumsatz ${d.calories.bmrKcal} kcal)` : "nicht berechnet (Ziel weder Abnehmen noch Muskelaufbau)"}`,
  );
  if (d.calories) out.push(steps(d.calories.steps));
  out.push(`**Markierungen (unplausibel/prüfen):** ${d.flags.length ? "" : "keine"}`);
  for (const f of d.flags) out.push(`- ⚠ ${f}`);
  return out.join("\n");
}

const md: string[] = [
  "# Testprofile – durchgespielt",
  "",
  `Erzeugt mit \`npm run testprofile:generate\` aus \`src/lib/plan/testprofile-fixtures.ts\` und denselben Funktionen wie die App (\`src/lib/plan/derive.ts\`). Stichtag ${TESTPROFILE_TODAY}. Die Zahlen prüft zusätzlich \`src/lib/plan/derive.test.ts\`.`,
  "",
  "**Alle mit „Annahme“ markierten Werte sind frei angenommen, damit sich die Regeln durchspielen lassen.**",
  "",
];

for (const p of TESTPROFILES) {
  md.push(`## ${p.title}`, "", `Vorgegeben: ${p.given.join(", ")}`, "", "Annahmen:", ...p.assumptions.map((a) => `- Annahme: ${a}`), "", render(deriveAll(p.input)), "");
  if (p.key === "laeufer") {
    const without = deriveAll({ ...p.input, answers: { ...p.input.answers, events: [], competedLast12Months: false } });
    md.push(
      "### Variante: derselbe Läufer ohne Wettkampf",
      "",
      `Ohne geplanten oder vergangenen Wettkampf: **Tier ${without.tier?.tier}**. Die WHO-Ausdauerempfehlung ist erfüllt, aber ohne 2 Krafteinheiten pro Woche nicht die vollständige Mindestempfehlung (McKay Tier 1 verlangt beides). Folge: ${without.testWeek.tests.find((t) => t.kind === "run_30min_submax") ? "kein 5-km-Zeitlauf, nur submaximaler 30-min-Lauf" : "unverändert"}.`,
      "",
    );
  }
  if (p.key === "coach") {
    const i = p.input;
    const age = 35;
    const w = derivePaces({ label: "5-km-Test", date: "2026-10-04", distanceM: 5000, seconds: 1260 }, "w", age);
    md.push(
      "### Vergleich: dieselben Werte mit Geschlecht weiblich",
      "",
      `- Riegel-Exponent Frauen 1,08283: 10 km ${formatDuration(w.races.find((r) => r.key === "10k")!.seconds)}, Halbmarathon ${formatDuration(w.races.find((r) => r.key === "hm")!.seconds)}`,
      `- Hyrox Women (Open): Sled Push ${HYROX_STANDARDS.women.sledPushKg} kg, Wall Ball ${HYROX_STANDARDS.women.wallBallKg} kg; Women Pro: Sled Push ${HYROX_STANDARDS.women_pro.sledPushKg} kg, Wall Ball ${HYROX_STANDARDS.women_pro.wallBallKg} kg`,
      `- Grundumsatz nur zum Vergleich (wird bei Ziel Hyrox nicht exportiert, R10): männlich ${formatNumber(mifflinStJeor("m", i.weightKg!, i.heightCm!, age), 2)} kcal, weiblich ${formatNumber(mifflinStJeor("w", i.weightKg!, i.heightCm!, age), 2)} kcal`,
      "",
    );
  }
}

writeFileSync("docs/TESTPROFILE.md", md.join("\n"));
console.log("docs/TESTPROFILE.md aktualisiert.");
