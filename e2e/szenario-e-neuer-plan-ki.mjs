import fs from "node:fs";
import { BASE, SHOTS, browser, check, login, newPage } from "./lib.mjs";
const clientId = fs.readFileSync(new URL("./.state/clara.txt", import.meta.url), "utf8").trim();
const fixture = JSON.parse(
  fs.readFileSync(new URL("../src/lib/plan/fixtures/hyrox-base-builder.json", import.meta.url), "utf8"),
);
const b = await browser();
const coach = await newPage(b);
await login(coach, "coach@example.com");

// Neuer Plan mit KI: Beschreibung → Prompt, leere Vorlage herunterladen
await coach.goto(`${BASE}/coach/kunden/${clientId}/plan`);
await coach.click("a:has-text('Neuer Plan mit KI')");
await coach.waitForURL(/\/plan\/neu$/);
await coach.fill("#beschreibung", "13 Wochen HYROX Base Builder, vollständig übernehmen");
await coach.click("summary:has-text('Prompt ansehen')");
const prompt = await coach.textContent("pre >> nth=0");
check(
  prompt.includes("13 Wochen HYROX Base Builder") && prompt.includes('"program"') && prompt.includes("0,45359237") && prompt.includes('"pt-coach-export"'),
  "Prompt enthält Beschreibung, Regeln, Schema und Vorlage",
);
check(!prompt.includes("Clara"), "Prompt ist pseudonymisiert (kein Name)");
const [download] = await Promise.all([coach.waitForEvent("download"), coach.click("button:has-text('JSON herunterladen')")]);
const vorlage = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
check(
  vorlage.format === "pt-coach-export" && vorlage.plan.weeks[0].days.some((d) => d.sessions.length === 0) && vorlage.client,
  `leere Vorlage heruntergeladen (${download.suggestedFilename()})`,
);

// Antwort der KI in zwei Teilen hochladen (Wochen 1–6 und 7–13)
const part = (weeks) => JSON.stringify({ ...vorlage, plan: { ...fixture, weeks } });
await coach.fill("#ki-antwort", "{ kein json");
await coach.click("button:has-text('Prüfen')");
await coach.waitForSelector("text=Kein gültiges JSON");
check(true, "ungültige Antwort wird verständlich abgelehnt");
await coach.fill("#ki-antwort", part(fixture.weeks.slice(0, 6)));
await coach.click("button:has-text('Prüfen')");
await coach.waitForSelector("text=Teil 1: Woche 1, 2, 3, 4, 5, 6");
await coach.fill("#ki-antwort", part(fixture.weeks.slice(6)));
await coach.click("button:has-text('Teil hinzufügen')");
await coach.waitForSelector("text=Teil 2: Woche 7");
const summary = await coach.textContent("body");
check(summary.includes("13 Wochen · 91 Tage (davon 14 Ruhetage) · 87 Einheiten · 247 Blöcke"), "zwei Teile zusammengeführt: 13 Wochen, 247 Blöcke");
await coach.screenshot({ path: SHOTS + "coach-neuer-plan-ki.png", fullPage: true });
await coach.click("button:has-text('Plan anlegen und aktiv setzen')");
await coach.waitForURL(/\/plan\?plan=/, { timeout: 20000 });
const planId = new URL(coach.url()).searchParams.get("plan");
check((await coach.textContent("body")).includes("HYROX PRO – Base Builder"), "Plan angelegt und aktiv");
check(await coach.isVisible("text=Ruhetag >> nth=0"), "Planansicht zeigt Ruhetage");

// Editor öffnet den großen Plan und speichert eine Änderung an einem Block
await coach.goto(`${BASE}/coach/kunden/${clientId}/plan/${planId}/bearbeiten`);
check(!(await coach.locator("details:has(summary:has-text('Woche 2'))").getAttribute("open") !== null), "Editor: große Pläne starten mit eingeklappten Wochen");
await coach.click("summary:has-text('Woche 1')");
await coach.locator("label:has-text('Name') input").first().fill("10 minute warm up run (easy)");
await coach.fill("input[placeholder='Was wurde geändert? (optional)']", "Block umbenannt");
await coach.click("button:has-text('Als neue Version speichern')");
await coach.waitForSelector("text=(aktuell Version 2)", { timeout: 20000 });
check(true, "Editor speichert Programm-Einheiten (Version 2)");

// Kunde: Programm-Einheit erfassen (Woche 2, Montag PM: Zeit, 3 × Gewicht …, AMRAP-Runden)
const client = await newPage(b, true);
await login(client, "clara@example.com");
await client.goto(`${BASE}/kunde/training/erfassen?plan=${planId}&einheit=w2d1-2`);
await client.waitForSelector("text=3x3 deadlift");
const inputs = client.locator("input[inputmode]");
const values = ["8:30", "60", "62,5", "65", "30", "30", "32,5", "20", "20", "22,5", "4"];
check((await inputs.count()) === values.length, `ein Feld je Wertung/Runde (${values.length})`);
for (let i = 0; i < values.length; i++) await inputs.nth(i).fill(values[i]);
await client.click("button:has-text('Ergebnisse speichern')");
await client.waitForSelector("text=Gespeichert – Einheit erledigt.");
check(true, "alle Blöcke erfasst → Einheit erledigt");
await client.reload();
check((await inputs.nth(0).inputValue()) === "8:30" && (await inputs.nth(2).inputValue()) === "62,5", "Werte bleiben gespeichert");
await client.screenshot({ path: SHOTS + "kunde-programm-einheit.png", fullPage: true });

// Fehlerhafte Eingabe
await inputs.nth(0).fill("8:75");
await client.click("button:has-text('Ergebnisse aktualisieren')");
await client.waitForSelector("text=Zeit bitte als mm:ss");
check(true, "ungültige Zeit wird gemeldet");

// Gewichte passend zum Geschlecht (Clara: w) – Wall Ball 20 lb m 9,1 / w 6,4 kg
await client.goto(`${BASE}/kunde/training/erfassen?plan=${planId}&einheit=w2d3-1`);
const load = (await client.locator("li", { hasText: "20 wall balls:" }).first().textContent()).trim();
check(load === "20 wall balls: 6,4 kg", `Vorgabe-Gewicht für Frauen angezeigt („${load}“)`);

// Verlauf und Coach-Sicht
await client.goto(BASE + "/kunde/training");
check((await client.textContent("body")).includes("5 Blöcke erledigt"), "Verlauf zeigt erledigte Blöcke");
await coach.goto(`${BASE}/coach/kunden/${clientId}/training/erfassen?plan=${planId}&einheit=w2d1-2`);
check((await coach.locator("input[inputmode]").nth(3).inputValue()) === "65", "Coach sieht die Werte des Kunden");

await b.close();
