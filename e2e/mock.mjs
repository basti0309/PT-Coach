// Lokaler Mock für Strava-API und Anthropic-API (nur für E2E-Tests).
import http from "node:http";
import fs from "node:fs";
const log = (o) => fs.appendFileSync(new URL("./.state/mock-requests.log", import.meta.url), JSON.stringify(o) + "\n");
const activities = new Map(); // id -> activity (über /__set gesetzt)
let subs = [];
let revoked = false;
const json = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
http.createServer(async (req, res) => {
  let body = ""; for await (const c of req) body += c;
  const url = new URL(req.url, "http://x");
  log({ method: req.method, path: url.pathname, auth: req.headers.authorization ?? null, query: url.search, body: body.slice(0, 20000) });
  if (url.pathname === "/__set" && req.method === "POST") { const a = JSON.parse(body); activities.set(a.id, a); return json(res, 200, { ok: true }); }
  if (url.pathname === "/__delete" && req.method === "POST") { activities.delete(JSON.parse(body).id); return json(res, 200, { ok: true }); }
  if (url.pathname === "/__revoke") { revoked = true; return json(res, 200, { ok: true }); }
  if (url.pathname === "/oauth/token" && revoked) return json(res, 400, { message: "Bad Request" });
  if (url.pathname === "/oauth/token") return json(res, 200, { access_token: "acc-" + Date.now(), refresh_token: "ref-2", expires_at: Math.floor(Date.now() / 1000) + 21600, athlete: { id: 777 } });
  if (url.pathname === "/athlete") return !revoked && req.headers.authorization ? json(res, 200, { id: 777 }) : json(res, 401, {});
  const m = url.pathname.match(/^\/activities\/(\d+)$/);
  if (m) { if (!req.headers.authorization?.startsWith("Bearer ")) return json(res, 401, {}); const a = activities.get(Number(m[1])); return a ? json(res, 200, a) : json(res, 404, {}); }
  if (url.pathname === "/push_subscriptions" && req.method === "GET") return json(res, 200, subs);
  if (url.pathname === "/push_subscriptions" && req.method === "POST") {
    const p = new URLSearchParams(body);
    const cb = new URL(p.get("callback_url"));
    cb.searchParams.set("hub.mode", "subscribe"); cb.searchParams.set("hub.verify_token", p.get("verify_token")); cb.searchParams.set("hub.challenge", "abc123");
    const v = await fetch(cb); const vj = await v.json().catch(() => ({}));
    if (vj["hub.challenge"] !== "abc123") return json(res, 400, { message: "callback validation failed" });
    subs = [{ id: 4242, callback_url: p.get("callback_url") }]; return json(res, 200, { id: 4242 });
  }
  if (url.pathname.startsWith("/push_subscriptions/") && req.method === "DELETE") { subs = []; res.writeHead(204); return res.end(); }
  if (url.pathname === "/v1/messages") {
    const b = JSON.parse(body);
    const user = b.messages.at(-1).content;
    const text = typeof user === "string" ? user : JSON.stringify(user);
    const decision = /AMRAP/i.test(text.split("Neue Kundennachricht")[1] ?? "")
      ? { action: "answer", answer: "AMRAP heißt: so viele Runden wie möglich in der vorgegebenen Zeit.", reason: "Begriffserklärung" }
      : { action: "escalate", answer: "", reason: "Mock: weiterleiten" };
    return json(res, 200, { id: "msg_mock", type: "message", role: "assistant", model: b.model, content: [{ type: "text", text: JSON.stringify(decision) }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } });
  }
  json(res, 404, { error: "unbekannt" });
}).listen(4010, () => console.log("mock on 4010"));
