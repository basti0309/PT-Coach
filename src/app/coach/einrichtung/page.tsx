import { Fragment } from "react";
import { ENV_VARIABLES, env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listSubscriptions, type Subscription } from "@/lib/strava/api";
import { STRAVA_SUBSCRIPTION_KEY, stravaConfig } from "@/lib/strava/config";
import { WebhookButtons } from "./webhook-buttons";
import { InviteForm } from "./invite-form";
import { INVITE_CODE_KEY } from "@/lib/accounts/invite";

export const metadata = { title: "Einrichtung" };

export default async function SetupPage() {
  const supabase = await createSupabaseServerClient();
  const { data: stored } = await supabase.from("app_settings").select("value, updated_at").eq("key", STRAVA_SUBSCRIPTION_KEY).maybeSingle();
  const { data: invite } = await supabase.from("app_settings").select("value").eq("key", INVITE_CODE_KEY).maybeSingle();
  const missing = ENV_VARIABLES.filter((v) => v.required && !process.env[v.name]);
  const stravaReady = ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET", "STRAVA_WEBHOOK_VERIFY_TOKEN", "NEXT_PUBLIC_SITE_URL"].every(
    (n) => process.env[n],
  );

  let subs: Subscription[] | null = null;
  let subsError = "";
  if (stravaReady) {
    try {
      subs = await listSubscriptions(stravaConfig());
    } catch (e) {
      subsError = e instanceof Error ? e.message : "Strava nicht erreichbar";
    }
  }
  const callbackUrl = process.env.NEXT_PUBLIC_SITE_URL ? `${env.siteUrl()}/api/strava/webhook` : "(NEXT_PUBLIC_SITE_URL fehlt)";
  const active = subs?.find((s) => s.id === stored?.value);

  return (
    <div className="space-y-4">
      <h1 className="h1">Einrichtung</h1>

      <section className="card space-y-3">
        <h2 className="h2">Strava-Webhook</h2>
        <p className="muted">
          Damit neue Strava-Aktivitäten automatisch ankommen, muss die App einmalig bei Strava ein Webhook-Abo anlegen. Strava prüft dabei
          die Adresse <code className="rounded bg-slate-100 px-1">{callbackUrl}</code> mit dem STRAVA_WEBHOOK_VERIFY_TOKEN.
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-slate-500">Status</dt>
          <dd>
            {!stravaReady && !env.stravaEnabled() && (
              <span className="text-slate-600">nicht eingerichtet (optional) – Kunden tragen Ausdauer von Hand ein; die Strava-Verbindung ist ausgeblendet.</span>
            )}
            {!stravaReady && env.stravaEnabled() && <span className="text-red-700">Strava-Variablen fehlen (siehe unten)</span>}
            {stravaReady && subsError && <span className="text-red-700">Fehler: {subsError}</span>}
            {stravaReady && !subsError && active && <span className="font-semibold text-green-700">✓ aktiv (Abo-ID {active.id})</span>}
            {stravaReady && !subsError && !active && subs && subs.length > 0 && (
              <span className="text-amber-700">Abo bei Strava vorhanden (ID {subs[0].id}), aber nicht in der App gespeichert – bitte registrieren.</span>
            )}
            {stravaReady && !subsError && subs && subs.length === 0 && <span className="text-amber-700">nicht registriert</span>}
          </dd>
          {subs?.map((s) => (
            <Fragment key={s.id}>
              <dt className="text-slate-500">Abo {s.id}</dt>
              <dd className="break-all">{s.callback_url}</dd>
            </Fragment>
          ))}
        </dl>
        {stravaReady && <WebhookButtons registered={Boolean(active)} />}
      </section>

      <section className="card space-y-2">
        <h2 className="h2">Selbstregistrierung (Einladungscode)</h2>
        <InviteForm
          current={typeof invite?.value === "string" ? invite.value : null}
          registerUrl={process.env.NEXT_PUBLIC_SITE_URL ? `${env.siteUrl()}/registrieren` : "/registrieren"}
        />
      </section>

      <section className="card space-y-2">
        <h2 className="h2">Umgebungsvariablen</h2>
        <p className="muted">Werden in Vercel gesetzt (siehe README_SETUP.md). Werte werden hier nicht angezeigt.</p>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {ENV_VARIABLES.map((v) => (
            <li key={v.name} className="flex items-center gap-2">
              <span>{process.env[v.name] ? "✅" : v.required ? "❌" : "➖"}</span>
              <code>{v.name}</code>
              {!v.required && <span className="muted">(optional)</span>}
            </li>
          ))}
        </ul>
        {missing.length > 0 && <p className="text-sm text-red-700">Es fehlen {missing.length} Pflicht-Variablen.</p>}
      </section>
    </div>
  );
}
