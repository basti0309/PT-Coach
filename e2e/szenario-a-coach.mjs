import fs from "node:fs";
import { BASE, SHOTS, browser, check, login, newPage } from "./lib.mjs";
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
const b = await browser();
const page = await newPage(b);
await login(page, "coach@example.com");
check(page.url().endsWith("/coach"), "Coach landet nach Code-Login im Coach-Bereich");
await page.screenshot({ path: SHOTS + "coach-uebersicht.png", fullPage: true });

// Einrichtung: Webhook + Einladungscode
await page.goto(BASE + "/coach/einrichtung");
await page.click("text=Strava-Webhook registrieren");
await page.waitForSelector("text=Webhook registriert", { timeout: 15000 });
await page.reload();
check(await page.isVisible("text=✓ aktiv (Abo-ID 4242)"), "Webhook-Status aktiv nach Button");
await page.click("button:has-text('Zufallscode erzeugen')");
await page.waitForSelector("text=Einladungscode gespeichert");
const code = (await page.locator("code").filter({ hasText: /^[A-Z0-9]{10}$/ }).first().textContent()).trim();
fs.writeFileSync(new URL("./.state/invite.txt", import.meta.url), code);
check(code.length === 10, "Einladungscode erzeugt: " + code);
await page.screenshot({ path: SHOTS + "coach-einrichtung.png", fullPage: true });

// Kunde anlegen
await page.goto(BASE + "/coach/kunden/neu");
await page.fill("#fullName", "Clara Test");
await page.fill("#email", "clara@example.com");
await page.click("button:has-text('Kunden anlegen')");
await page.waitForURL(/\/coach\/kunden\/[0-9a-f-]{36}$/);
const clientId = page.url().split("/").pop();
fs.writeFileSync(new URL("./.state/clara.txt", import.meta.url), clientId);
check(await page.isVisible("text=CT"), "Kürzel CT vorgeschlagen und gespeichert");

// Plan anlegen + Import
await page.goto(`${BASE}/coach/kunden/${clientId}/plan`);
await page.fill("#title", "E2E-Plan");
await page.fill("#startDate", today);
await page.click("button:has-text('Plan anlegen')");
await page.waitForURL(/bearbeiten$/);
const planId = page.url().split("/").at(-2);
fs.writeFileSync(new URL("./.state/plan.txt", import.meta.url), planId);
const plan = {
  schemaVersion: 1, title: "E2E-Plan", startDate: today,
  weeks: [{ week: 1, days: [
    { day: 1, sessions: [
      { id: "w1d1-kraft", type: "strength", title: "Kraft A", exercises: [{ exerciseId: "kniebeuge", name: "Kniebeuge", sets: 3, reps: 5, targetWeightKg: 60, restSeconds: 3 }] },
      { id: "w1d1-lauf", type: "endurance", sport: "laufen", durationMinutes: 40, distanceKm: 8, intensity: "locker" },
      { id: "w1d1-wod", type: "wod", name: "Cindy", wodId: "cindy", wodType: "amrap", durationMinutes: 20, movements: [{ name: "Klimmzüge", reps: 5 }, { name: "Liegestütze", reps: 10 }, { name: "Air Squats", reps: 15 }] },
    ] },
    { day: 2, sessions: [
      { id: "w1d2-kraft", type: "strength", title: "Kraft B", exercises: [{ exerciseId: "kniebeuge", name: "Kniebeuge", sets: 3, reps: 5, targetWeightKg: 62.5, restSeconds: 90 }] },
      { id: "w1d2-wod", type: "wod", name: "Cindy (Wiederholung)", wodType: "amrap", durationMinutes: 20, movements: [{ name: "klimmzüge", reps: 5 }, { name: "Liegestütze", reps: 10 }, { name: "Air-Squats", reps: 15 }] },
    ] },
  ] }],
};
await page.goto(`${BASE}/coach/kunden/${clientId}/plan/${planId}/import`);
// zuerst ein fehlerhafter Plan
const bad = structuredClone(plan); bad.weeks[0].days[0].sessions[0].exercises[0].sets = 0; bad.titel = "x";
await page.fill("#json", JSON.stringify({ format: "pt-coach-export", exportVersion: 1, client: {}, plan: bad }));
await page.click("button:has-text('Prüfen')");
await page.waitForSelector("text=kann so nicht übernommen werden");
const errText = await page.textContent("body");
check(errText.includes("Sätze („sets“): muss mindestens 1 sein") && errText.includes("„titel“"), "Import zeigt verständliche Fehler");
await page.screenshot({ path: SHOTS + "import-fehler.png", fullPage: true });
await page.fill("#json", JSON.stringify(plan, null, 2));
await page.click("button:has-text('Prüfen')");
await page.waitForSelector("text=Änderungen prüfen");
check(await page.isVisible("text=+ neu: Woche 1, Tag 1: w1d1-kraft"), "Diff-Zusammenfassung zeigt neue Einheiten");
await page.screenshot({ path: SHOTS + "import-diff.png", fullPage: true });
await page.click("button:has-text('Bestätigen und als neue Version übernehmen')");
await page.waitForURL(/\/plan\?plan=/);
check(await page.isVisible("text=Version 2"), "Import erzeugt Version 2");

// Export ansehen
await page.goto(`${BASE}/coach/kunden/${clientId}/plan/${planId}/export`);
const pre = await page.textContent("pre");
check(pre.includes('"label": "CT"') && !pre.includes("Clara"), "Export pseudonymisiert (CT statt Name)");
await page.fill("#aufgabe", "Woche 2 ergänzen");
await page.click("summary:has-text('Prompt ansehen')");
const prompt = await page.locator("pre").nth(1).textContent();
check(prompt.includes("Woche 2 ergänzen") && prompt.includes('"$schema"') && prompt.includes('"pt-coach-export"'), "Prompt enthält Aufgabe, Schema und Export");
await page.goto(`${BASE}/coach/kunden/${clientId}/plan/${planId}/export?klarnamen=1`);
check((await page.textContent("pre")).includes('"label": "Clara Test"'), "Export mit Klarnamen auf Wunsch");
await b.close();
