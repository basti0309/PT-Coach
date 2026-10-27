import fs from "node:fs";
import { BASE, SHOTS, browser, check, login, newPage } from "./lib.mjs";
const clientId = fs.readFileSync(new URL("./.state/clara.txt", import.meta.url), "utf8").trim();
const planId = fs.readFileSync(new URL("./.state/plan.txt", import.meta.url), "utf8").trim();
const b = await browser();
const coach = await newPage(b);
await login(coach, "coach@example.com");

// Editor: Ausdauereinheit hinzufügen und speichern
await coach.goto(`${BASE}/coach/kunden/${clientId}/plan/${planId}/bearbeiten`);
await coach.locator("button:has-text('+ Ausdauer')").nth(1).click();
await coach.fill("input[placeholder='Was wurde geändert? (optional)']", "Lauf an Tag 2 ergänzt");
await coach.click("button:has-text('Als neue Version speichern')");
await coach.waitForSelector("text=Gespeichert als Version 3", { timeout: 15000 });
check(true, "Editor speichert neue Version 3");
// ungültige Eingabe → Fehlermeldung
await coach.locator("label:has-text('Intensität') input").last().fill("");
await coach.click("button:has-text('Als neue Version speichern')");
await coach.waitForSelector("text=Plan ist noch nicht gültig");
check((await coach.textContent("body")).includes("Intensität („intensity“): Pflichtfeld fehlt"), "Editor zeigt Validierungsfehler verständlich");
await coach.screenshot({ path: SHOTS + "coach-editor.png", fullPage: true });

// Versionen + Wiederherstellen
await coach.goto(`${BASE}/coach/kunden/${clientId}/plan/${planId}/versionen`);
check(await coach.isVisible("text=Lauf an Tag 2 ergänzt"), "Versionsliste mit Änderungsnotiz");
await coach.click("a:has-text('Unterschied ansehen') >> nth=0");
await coach.waitForSelector("text=→ aktuelle Version 3");
check(true, "Diff alte/aktuelle Version");
await coach.screenshot({ path: SHOTS + "coach-versionen.png", fullPage: true });
await coach.locator("button:has-text('Wiederherstellen')").first().click();
await coach.waitForSelector("text=Wiederhergestellt aus Version 2");
check(await coach.isVisible("text=Version 4"), "Wiederherstellen legt Version 4 an");

// Coach erfasst Ausdauer für den Kunden
await coach.goto(`${BASE}/coach/kunden/${clientId}/training/ausdauer`);
await coach.fill("input[placeholder='45 oder 1:05:30']", "30");
await coach.fill("input[placeholder='8,5']", "5");
await coach.click("button:has-text('Speichern')");
await coach.waitForURL(/\/training$/);
check((await coach.textContent("body")).includes("erfasst von Coach (Coach)"), "Eintrag zeigt: erfasst vom Coach");

// Wissensbasis + Regeln
await coach.goto(BASE + "/coach/wissen");
await coach.fill("input[name=title] >> nth=0", "Was ist ein EMOM?");
await coach.fill("textarea[name=content] >> nth=0", "Every Minute On the Minute: jede Minute startet eine neue Runde.");
await coach.click("button:has-text('Hinzufügen')");
await coach.waitForSelector("text=Eintrag löschen");
check(true, "Wissensbasis-Eintrag angelegt");
await coach.goto(BASE + "/coach/regeln");
check((await coach.locator("text=Schwangerschaft").count()) > 0 && !(await coach.isVisible("input[type=checkbox] >> nth=7")), "Pflichtregeln sichtbar, eigene Regeln editierbar");
await coach.screenshot({ path: SHOTS + "coach-regeln.png", fullPage: true });

// Kunde sieht den Eintrag des Coaches
const client = await newPage(b, true);
await login(client, "clara@example.com");
await client.goto(BASE + "/kunde/training");
check((await client.textContent("body")).includes("erfasst von Coach (Coach)"), "Kunde sieht, dass der Coach den Eintrag erfasst hat");
// Kunde kann nicht in den Coach-Bereich
await client.goto(BASE + "/coach");
check(client.url().endsWith("/kunde"), "Kunde wird aus dem Coach-Bereich umgeleitet");
await client.goto(`${BASE}/coach/kunden/${clientId}/plan`);
check(client.url().endsWith("/kunde"), "Kunde kommt nicht an Coach-Unterseiten");
await b.close();
