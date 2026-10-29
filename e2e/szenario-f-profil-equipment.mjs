// Profil und Fragebogen in einem Formular; Equipment zu Hause / im Gym (BikeErg/Rolle), alte Fragebogen-Adresse leitet um.
import fs from "node:fs";
import { BASE, SHOTS, browser, check, login, newPage } from "./lib.mjs";
const clientId = fs.readFileSync(new URL("./.state/clara.txt", import.meta.url), "utf8").trim();
const b = await browser();
const page = await newPage(b, true);
await login(page, "clara@example.com");

await page.goto(BASE + "/kunde/profil/fragebogen");
await page.waitForURL(/\/kunde\/profil$/);
check(true, "Alte Fragebogen-Adresse leitet aufs Profil um");

const gym = page.locator("fieldset:has(legend:has-text('Was gibt es in deinem Gym?'))");
await page.selectOption("label:has-text('Hast du Zugang zu einem Gym?') select", "nein");
check((await gym.count()) === 0, "Ohne Gymzugang keine Gym-Liste");
await page.selectOption("label:has-text('Hast du Zugang zu einem Gym?') select", "ja");
const home = page.locator("fieldset:has(legend:has-text('Was hast du zu Hause?'))");
await home.locator("label:has-text('BikeErg / Rolle') input").check();
await gym.locator("label:has-text('Schlitten') input").check();
await gym.locator("label:has-text('SkiErg') input").check();
await page.fill("label:has-text('Sonstiges im Gym') textarea", "zwei Schlitten");
await page.click("button:has-text('Speichern')");
await page.waitForSelector("text=Gespeichert.");
check(true, "Ein Speichern-Button speichert Stammdaten und Equipment");

await page.reload();
check(await home.locator("label:has-text('BikeErg / Rolle') input").isChecked(), "BikeErg / Rolle zu Hause bleibt nach Neuladen angehakt");
check(await gym.locator("label:has-text('SkiErg') input").isChecked(), "SkiErg im Gym bleibt nach Neuladen angehakt");
check((await page.inputValue("label:has-text('Sonstiges im Gym') textarea")) === "zwei Schlitten", "Gym-Freitext bleibt erhalten");
await page.screenshot({ path: SHOTS + "kunde-profil-equipment.png", fullPage: true });
await page.context().close();

const coach = await newPage(b);
await login(coach, "coach@example.com");
await coach.goto(`${BASE}/coach/kunden/${clientId}/fragebogen`);
await coach.waitForURL(/\/profil$/);
check((await coach.locator("a:has-text('Fragebogen')").count()) === 0, "Coach: kein Reiter „Fragebogen“ mehr, alte Adresse führt aufs Profil");
const coachGym = coach.locator("fieldset:has(legend:has-text('Was gibt es in deinem Gym?'))");
check(await coachGym.locator("label:has-text('Schlitten') input").isChecked(), "Coach sieht das Equipment des Kunden im Profil");
await b.close();
