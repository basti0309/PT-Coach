import fs from "node:fs";
import { BASE, SHOTS, browser, check, latestMail, newPage } from "./lib.mjs";
const invite = fs.readFileSync(new URL("./.state/invite.txt", import.meta.url), "utf8").trim().slice(0, 10);
const b = await browser();

// 1) Selbstregistrierung mit Einladungscode
let page = await newPage(b, true);
await page.goto(BASE + "/registrieren");
await page.fill("input[name=fullName]", "Dora Neu");
await page.fill("input[name=email]", "dora@example.com");
await page.fill("input[name=code]", "FALSCH123");
await page.click("button:has-text('Registrieren')");
await page.waitForSelector("text=Der Einladungscode stimmt nicht.");
check(true, "Falscher Einladungscode wird abgelehnt");
const since = Date.now() - 1000;
await page.fill("input[name=code]", invite.toLowerCase());
await page.click("button:has-text('Registrieren')");
await page.waitForSelector("#code");
const mail = await latestMail("dora@example.com", since);
await page.fill("#code", /Code[^0-9]*(\d{6})/.exec(mail.Text)[1]);
await page.click("button:has-text('Anmelden')");
await page.waitForURL(/\/kunde$/);
check(true, "Registrierung mit Einladungscode → sofort Kundenbereich");
await page.screenshot({ path: SHOTS + "kunde-heute-dora.png" });
await page.context().close();

// 2) Login per Link in einem ANDEREN Browser-Kontext (wie Link aus Mail-App)
page = await newPage(b, true);
const since2 = Date.now() - 1000;
await page.goto(BASE + "/login");
await page.fill("#email", "clara@example.com");
await page.click("text=Anmeldelink senden");
await page.waitForSelector("#code");
const mail2 = await latestMail("clara@example.com", since2);
const link = /\( (http[^ ]+auth\/confirm[^ ]+) \)/.exec(mail2.Text)[1];
await page.context().close();
page = await newPage(b, true);
await page.goto(link);
await page.waitForURL(/\/kunde$/, { timeout: 15000 });
check(true, "Login per Link (token_hash) funktioniert in einem fremden Browser");

// 3) Heute-Seite und Krafterfassung
check(await page.isVisible("text=Kraft A"), "Heute zeigt die heutige Krafteinheit");
await page.screenshot({ path: SHOTS + "kunde-heute.png", fullPage: true });
await page.click("text=Kraft A");
await page.waitForSelector("text=Plan: 3 × 5");
const weight1 = page.getByLabel("Satz 1 Gewicht in kg");
check((await weight1.getAttribute("placeholder")) === "60", "Ohne Historie: Plan-Vorgabe als Platzhalter (60)");
await weight1.fill("70");
await page.getByLabel("Satz 1 Wiederholungen").fill("5");
await page.getByLabel("Satz 1 abhaken").click();
await page.waitForSelector("[role=timer]");
check(true, "Pausentimer erscheint nach dem Abhaken");
await page.screenshot({ path: SHOTS + "kunde-kraft-timer.png" });
await page.waitForSelector("text=Pause vorbei", { timeout: 8000 });
check(true, "Pausentimer läuft ab (3 s Plan-Pause)");
// Satz 2: leeres Feld + Abhaken übernimmt Platzhalter (Plan-Vorgabe)
await page.getByLabel("Satz 2 Gewicht in kg").fill("72,5");
await page.getByLabel("Satz 2 Wiederholungen").fill("4");
await page.getByLabel("Satz 2 abhaken").click();
await page.waitForTimeout(800);
await page.getByLabel("Satz 3 abhaken").click();
await page.waitForTimeout(800);
await page.click("button:has-text('Training abschließen')");
await page.waitForSelector("text=✓ Training abgeschlossen");
check(true, "Krafttraining abgeschlossen");

// 4) Zweite Einheit mit gleicher Übungs-ID → Werte vom letzten Mal als Platzhalter
await page.goto(BASE + "/kunde/plan");
await page.click("text=Kraft B");
await page.waitForSelector("text=Plan: 3 × 5");
const ph = [];
for (const i of [1, 2, 3]) ph.push([await page.getByLabel(`Satz ${i} Gewicht in kg`).getAttribute("placeholder"), await page.getByLabel(`Satz ${i} Wiederholungen`).getAttribute("placeholder")]);
console.log("Platzhalter:", JSON.stringify(ph));
check(JSON.stringify(ph) === JSON.stringify([["70", "5"], ["72,5", "4"], ["60", "5"]]), "Platzhalter = Werte vom letzten Mal je Satz");
await page.getByLabel("Satz 1 Gewicht in kg").focus();
check((await page.getByLabel("Satz 1 Gewicht in kg").inputValue()) === "70", "Tap ins leere Feld übernimmt den Platzhalter");
await page.screenshot({ path: SHOTS + "kunde-kraft-vorbefuellung.png", fullPage: true });

// 5) WOD erfassen und Wiedererkennung über Bewegungsliste
await page.goto(BASE + "/kunde/plan");
await page.click("text=WOD: Cindy");
await page.waitForSelector("text=Dieses WOD hast du noch nicht eingetragen.");
const inputs = page.locator("input[inputmode=numeric]");
await inputs.nth(0).fill("14");
await inputs.nth(1).fill("3");
await page.fill("input[placeholder^='z. B. KB']", "Band grün");
await page.click("button:has-text('Ergebnis speichern')");
await page.waitForSelector("text=Gespeichert.");
await page.goto(BASE + "/kunde/plan");
await page.click("text=WOD: Cindy (Wiederholung)");
await page.waitForSelector("text=Letztes Mal");
check(await page.isVisible("text=14 Runden + 3 Wdh."), "WOD ohne wodId über normalisierte Bewegungsliste erkannt, letztes Ergebnis angezeigt");
check(await page.isVisible("text=Gewichte: Band grün"), "verwendete Gewichte angezeigt");
await page.screenshot({ path: SHOTS + "kunde-wod.png", fullPage: true });

// 6) Profil: Geburtsdatum, Testwerte, Kalorien
await page.goto(BASE + "/kunde/profil");
await page.selectOption("select[name=sex]", "w");
await page.fill("input[name=birth_date]", "1990-01-15");
await page.fill("input[name=height_cm]", "168");
await page.click("form:has(input[name=birth_date]) button:has-text('Speichern')");
await page.waitForSelector("text=Gespeichert.");
check(await page.locator("input[name=protein_g]").isDisabled(), "Nährstoffziele für Kunden gesperrt");
await page.selectOption("select[name=kind]", "body_weight");
await page.fill("input[name=value]", "64,5");
await page.click("button:has-text('Testwert hinzufügen')");
await page.waitForSelector("text=Testwert gespeichert.");
await page.selectOption("select[name=kind]", "run_5k");
await page.fill("input[name=value]", "25:00");
await page.click("button:has-text('Testwert hinzufügen')");
await page.waitForTimeout(1500);
await page.reload();
const body = await page.textContent("body");
check(/Geburtsdatum \(36 Jahre\)/.test(body), "Alter aus Geburtsdatum berechnet (36)");
// 10·64,5 + 6,25·168 − 5·36 − 161 = 645 + 1050 − 180 − 161 = 1354; × 1,5 = 2031
check(body.includes("= 645 + 1.050 − 180 − 161 = 1.354 kcal") && body.includes("2.031 kcal"), "Kalorienbedarf mit Rechenweg korrekt");
await page.screenshot({ path: SHOTS + "kunde-profil.png", fullPage: true });
await b.close();
