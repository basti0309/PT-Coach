import { afterEach, describe, expect, it, vi } from "vitest";
import { canAccessAthlete, getActivity, needsRefresh, refreshAccessToken, StravaAuthError, verifyWebhookChallenge } from "./api";

const cfg = { apiBase: "https://strava.example/api/v3", clientId: "42", clientSecret: "geheim" };

afterEach(() => vi.unstubAllGlobals());

describe("Strava-API", () => {
  it("sendet das Access Token im Authorization-Header an STRAVA_API_BASE", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 1, sport_type: "Run", start_date: "x", start_date_local: "x", moving_time: 60 })));
    vi.stubGlobal("fetch", fetchMock);
    await getActivity(cfg, "tok", 1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://strava.example/api/v3/activities/1");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(url).not.toContain("access_token");
  });

  it("404 → not_found, 401 → StravaAuthError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    expect(await getActivity(cfg, "tok", 1)).toBe("not_found");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    await expect(getActivity(cfg, "tok", 1)).rejects.toBeInstanceOf(StravaAuthError);
    expect(await canAccessAthlete(cfg, "tok")).toBe(false);
  });

  it("Refresh: grant_type=refresh_token an {base}/oauth/token", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: "neu", refresh_token: "r2", expires_at: 1900000000 })));
    vi.stubGlobal("fetch", fetchMock);
    const t = await refreshAccessToken(cfg, "r1");
    expect(t.access_token).toBe("neu");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://strava.example/api/v3/oauth/token");
    const body = new URLSearchParams(String(init.body));
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("r1");
  });

  it("Refresh nötig bei weniger als 60 s Restlaufzeit", () => {
    const now = new Date("2026-10-27T10:00:00Z");
    expect(needsRefresh(new Date("2026-10-27T10:00:30Z"), now)).toBe(true);
    expect(needsRefresh(new Date("2026-10-27T10:05:00Z"), now)).toBe(false);
  });

  it("Webhook-Validierung mit hub.challenge und Verify-Token", () => {
    const ok = new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": "STRAVA", "hub.challenge": "15f7d1a91c1f40f8a748fd134752feb3" });
    expect(verifyWebhookChallenge(ok, "STRAVA")).toEqual({ "hub.challenge": "15f7d1a91c1f40f8a748fd134752feb3" });
    expect(verifyWebhookChallenge(ok, "anders")).toBeNull();
    expect(verifyWebhookChallenge(ok, "")).toBeNull();
  });
});
