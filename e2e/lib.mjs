import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
export const BASE = "http://127.0.0.1:3000";
export const SHOTS = new URL("./.state/shots/", import.meta.url).pathname;
export async function latestMail(to, since) {
  for (let i = 0; i < 40; i++) {
    const r = await fetch("http://127.0.0.1:54324/api/v1/messages").then((r) => r.json());
    const m = r.messages.find((m) => m.To.some((t) => t.Address === to) && new Date(m.Created).getTime() >= since);
    if (m) return fetch(`http://127.0.0.1:54324/api/v1/message/${m.ID}`).then((r) => r.json());
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("keine Mail für " + to);
}
export async function login(page, email) {
  const since = Date.now() - 1000;
  await page.goto(BASE + "/login");
  await page.fill("#email", email);
  await page.click("text=Anmeldelink senden");
  await page.waitForSelector("#code");
  const mail = await latestMail(email, since);
  const code = /Code[^0-9]*(\d{6})/.exec(mail.Text)?.[1];
  if (!code) throw new Error("kein Code in Mail: " + mail.Text.slice(0, 300));
  await page.fill("#code", code);
  await page.click("button:has-text('Anmelden')");
  await page.waitForURL(/\/(coach|kunde)/);
}
export async function browser() {
  const b = await chromium.launch();
  return b;
}
export async function newPage(b, mobile = false) {
  const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  return page;
}
export function check(cond, msg) {
  console.log((cond ? "OK   " : "FAIL ") + msg);
  if (!cond) process.exitCode = 1;
}
