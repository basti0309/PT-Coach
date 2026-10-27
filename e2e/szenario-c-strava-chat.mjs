import fs from "node:fs";
import { execSync } from "node:child_process";
import { BASE, SHOTS, browser, check, login, newPage } from "./lib.mjs";
const sql = (q) => execSync(`PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -Atc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const clientId = fs.readFileSync(new URL("./.state/clara.txt", import.meta.url), "utf8").trim();
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
const mock = (path, body) => fetch("http://127.0.0.1:4010" + path, { method: "POST", body: JSON.stringify(body) });
const event = (e) => fetch(BASE + "/api/strava/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription_id: 4242, owner_id: 777, event_time: 1, updates: {}, ...e }) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Webhook GET-Validierung
let r = await fetch(`${BASE}/api/strava/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=xyz`);
check(r.status === 200 && (await r.json())["hub.challenge"] === "xyz", "Webhook-Validierung (GET) mit richtigem Token");
r = await fetch(`${BASE}/api/strava/webhook?hub.mode=subscribe&hub.verify_token=falsch&hub.challenge=xyz`);
check(r.status === 403, "Webhook-Validierung lehnt falsches Token ab");

const b = await browser();
const client = await newPage(b, true);
await login(client, "clara@example.com");

// Strava verbinden (Autorisierungsseite von Strava wird abgefangen)
let authorizeUrl = null;
await client.route("https://www.strava.com/**", (route) => { authorizeUrl = route.request().url(); route.fulfill({ status: 200, body: "strava" }); });
await client.goto(BASE + "/kunde/profil");
await client.click("text=Mit Strava verbinden");
await client.waitForTimeout(1500);
const au = new URL(authorizeUrl);
check(au.searchParams.get("scope") === "activity:read_all" && au.searchParams.get("redirect_uri") === BASE + "/api/strava/callback", "OAuth-Weiterleitung mit Scope activity:read_all");
await client.goto(`${BASE}/api/strava/callback?state=falsch&code=abc&scope=read,activity:read_all`);
check(client.url().includes("strava=fehler"), "Callback mit falschem state wird abgelehnt");
await client.goto(BASE + "/kunde/profil");
await client.click("text=Mit Strava verbinden");
await client.waitForTimeout(1000);
const state = new URL(authorizeUrl).searchParams.get("state");
await client.goto(`${BASE}/api/strava/callback?state=${state}&code=abc&scope=read,activity:read_all`);
check(client.url().includes("strava=verbunden") && (await client.isVisible("text=✓ Verbunden seit")), "Strava verbunden");
check(sql(`select count(*) from strava_connections where client_id='${clientId}' and athlete_id=777`) === "1", "Tokens serverseitig gespeichert");

// Aktivität vor der Verbindung → ignoriert
await mock("/__set", { id: 9000, athlete: { id: 777 }, sport_type: "Run", start_date: "2020-01-01T08:00:00Z", start_date_local: "2020-01-01T09:00:00Z", moving_time: 1000, distance: 3000 });
await event({ object_type: "activity", object_id: 9000, aspect_type: "create" });
// Lauf heute (Wettkampf) → passt zu w1d1-lauf
const start = new Date().toISOString();
await mock("/__set", { id: 9001, athlete: { id: 777 }, sport_type: "Run", start_date: start, start_date_local: today + "T18:00:00Z", moving_time: 2580, distance: 8420.4, average_heartrate: 151.3, workout_type: 1 });
await event({ object_type: "activity", object_id: 9001, aspect_type: "create" });
// Schwimmen → ungeplant
await mock("/__set", { id: 9002, athlete: { id: 777 }, sport_type: "Swim", start_date: start, start_date_local: today + "T07:00:00Z", moving_time: 1800, distance: 1500 });
await event({ object_type: "activity", object_id: 9002, aspect_type: "create" });
await sleep(2500);
check(sql("select count(*) from strava_activities where strava_activity_id=9000") === "0", "Aktivität vor Verbindung nicht importiert");
check(sql(`select w.session_id||'|'||w.duration_seconds||'|'||coalesce(w.distance_m::text,'null')||'|'||w.source from workout_logs w join strava_activities a on a.workout_log_id=w.id where a.strava_activity_id=9001`) === "w1d1-lauf|2580|null|strava", "Lauf der geplanten Einheit zugeordnet; im Log keine Distanz");
const sv = sql("select matched||'|'||is_test||'|'||planned_duration_seconds||'|'||planned_distance_m||'|'||distance_m||'|'||avg_hr from strava_activities where strava_activity_id=9001");
check(sv === "true|true|2400|8000.0|8420.4|151.3", "Strava-Werte + Sollwerte nur in strava_activities: " + sv);
check(sql("select coalesce(w.session_id,'ungeplant')||'|'||w.title from workout_logs w join strava_activities a on a.workout_log_id=w.id where a.strava_activity_id=9002") === "ungeplant|Schwimmen (ungeplant)", "Schwimmen als ungeplante Einheit");
const authHeaders = fs.readFileSync(new URL("./.state/mock-requests.log", import.meta.url), "utf8").split("\n").filter(Boolean).map(JSON.parse).filter((x) => x.path.startsWith("/activities/"));
check(authHeaders.length > 0 && authHeaders.every((x) => x.auth?.startsWith("Bearer ") && !x.query.includes("access_token")), "Strava-Abrufe mit Token im Authorization-Header");

// Kunde sieht km, Puls, Abweichung
await client.goto(BASE + "/kunde/training");
let txt = await client.textContent("body");
check(txt.includes("8,42 km") && txt.includes("Ø 151 bpm") && txt.includes("+3:00 (+7,5 %)") && txt.includes("+0,42 km (+5,3 %)"), "Kunde sieht Distanz, Puls und Abweichung (Dauer +3:00/+7,5 %, Distanz +0,42 km/+5,3 %)");
await client.screenshot({ path: SHOTS + "kunde-training-strava.png", fullPage: true });

// Coach sieht nur Dauer + Status
const coach = await newPage(b);
await login(coach, "coach@example.com");
await coach.goto(`${BASE}/coach/kunden/${clientId}/training`);
txt = await coach.textContent("body");
check(txt.includes("Dauer 43:00") && txt.includes("Strava") && !txt.includes("8,42") && !txt.includes("151") && !txt.includes("Abweichung"), "Coach sieht von Strava-Einheit nur Dauer und Erledigt-Status");
await coach.screenshot({ path: SHOTS + "coach-training-strava.png", fullPage: true });
await coach.goto(`${BASE}/coach/kunden/${clientId}/fortschritt`);
txt = await coach.textContent("body");
check(!txt.includes("Distanz in km") && !(await coach.isVisible("button:has-text('km')")), "Coach-Graph ohne km-Umschalter");
check(txt.includes("5-km-Testzeit") && !txt.includes("Strava)"), "Coach-Prognose nur aus manuellem Testwert");
await coach.screenshot({ path: SHOTS + "coach-fortschritt.png", fullPage: true });

// Kunde: Fortschritt mit km + Prognose
await client.goto(BASE + "/kunde/fortschritt");
await client.click("button:has-text('km')");
await client.waitForTimeout(500);
txt = await client.textContent("body");
check(txt.includes("Distanz in km") && txt.includes("Halbmarathon") && txt.includes("unsicherer"), "Kunde: km-Graph und Prognosen mit Unsicherheits-Hinweis");
await client.screenshot({ path: SHOTS + "kunde-fortschritt.png", fullPage: true });

// Chat mit KI-Vorfilter
await client.goto(BASE + "/kunde/chat");
await client.fill("textarea", "Was ist AMRAP?");
await client.click("button:has-text('Senden')");
await client.waitForSelector("text=AMRAP heißt", { timeout: 15000 });
check(await client.isVisible("text=KI-Antwort (automatisch)"), "KI-Antwort sichtbar gekennzeichnet");
await client.fill("textarea", "Mein Knie tut seit gestern weh, darf ich laufen?");
await client.click("button:has-text('Senden')");
await client.waitForSelector("text=an deinen Coach weitergeleitet", { timeout: 15000 });
check(true, "Schmerz-Nachricht eskaliert, Kunde bekommt Info");
await coach.goto(BASE + "/coach/posteingang");
txt = await coach.textContent("body");
check(txt.includes("Mein Knie tut seit gestern weh") && txt.includes("Pflichtregel „Schmerzen“"), "Coach-Posteingang zeigt eskalierte Nachricht mit Grund");
await coach.screenshot({ path: SHOTS + "coach-posteingang.png", fullPage: true });
await coach.click("text=Antworten");
await coach.fill("textarea", "Bitte heute pausieren, ich rufe dich an.");
await coach.click("button:has-text('Senden')");
await client.waitForSelector("text=Bitte heute pausieren", { timeout: 15000 });
check(true, "Coach-Antwort erscheint beim Kunden live (Realtime, ohne Neuladen)");
await client.screenshot({ path: SHOTS + "kunde-chat.png", fullPage: true });
await coach.goto(BASE + "/coach/posteingang");
check(await coach.isVisible("text=Alles erledigt"), "Posteingang nach Antwort leer");
const aiBodies = fs.readFileSync(new URL("./.state/mock-requests.log", import.meta.url), "utf8").split("\n").filter(Boolean).map(JSON.parse).filter((x) => x.path === "/v1/messages").map((x) => x.body);
check(aiBodies.length === 2, "Jede Kundennachricht ging an die KI (2 Aufrufe)");
check(aiBodies.every((x) => !x.includes("8420") && !x.includes("151.3") && !x.includes("strava") && !x.includes("Clara") && x.includes('\\"label\\":\\"CT\\"')), "KI-Kontext ohne Strava-Werte und pseudonymisiert");

// delete + Deautorisierung
await mock("/__delete", { id: 9002 });
await event({ object_type: "activity", object_id: 9002, aspect_type: "delete" });
await event({ object_type: "athlete", object_id: 777, aspect_type: "update", updates: { authorized: "false" } });
await sleep(2500);
check(sql("select count(*) from strava_activities where strava_activity_id=9002") === "0", "delete-Ereignis entfernt die Aktivität");
check(sql(`select count(*) from strava_activities where client_id='${clientId}'`) === "1", "Deautorisierung ohne Bestätigung durch Strava löscht nichts");
await mock("/__revoke", {});
await event({ object_type: "athlete", object_id: 777, aspect_type: "update", updates: { authorized: "false" } });
await sleep(2500);
check(sql(`select (select count(*) from strava_activities where client_id='${clientId}')||'|'||(select count(*) from workout_logs where client_id='${clientId}' and source='strava')||'|'||(select count(*) from strava_connections where client_id='${clientId}')`) === "0|0|0", "Deautorisierung löscht alle Strava-Daten des Kunden");
await b.close();
