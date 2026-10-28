import { formatDuration, formatNumber } from "@/lib/format";
import type { Derived } from "@/lib/plan/derive";
import { formatPace } from "@/lib/calc/paces";

const VARIANT = { max: "maximal", submax: "submaximal", entfaellt: "entfällt" } as const;

function Steps({ steps }: { steps: string[] }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-brand-700">Rechenweg</summary>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-slate-600">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </details>
  );
}

/** Abgeleitete Werte für den Coach (gleich wie client.derived im Export) – zum Prüfen der KI-Vorschläge. */
export function DerivedView({ d }: { d: Derived }) {
  return (
    <section className="card space-y-4">
      <h2 className="h2">Abgeleitete Werte (Regelwerk v{d.rulesetVersion})</h2>
      <p className="muted">Siehe docs/REGELWERK.md. Diese Werte gehen mit Rechenweg in den JSON-Export.</p>

      {d.flags.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
          {d.flags.map((f, i) => (
            <li key={i}>⚠ {f}</li>
          ))}
        </ul>
      )}

      <div className="space-y-1">
        <h3 className="font-semibold">R1 Einstufung (McKay 2022)</h3>
        {d.tier ? (
          <>
            <p>
              Tier {d.tier.tier}
              {d.tier.tier3Possible && " – Tier 3+ möglich (prüfen)"}
            </p>
            <Steps steps={d.tier.steps} />
          </>
        ) : (
          <p className="muted">Trainingsumfang und Wettkampfniveau fehlen.</p>
        )}
      </div>

      {d.startVolume && (
        <div className="space-y-1">
          <h3 className="font-semibold">R2 Startumfang</h3>
          <p>
            {formatNumber(d.startVolume.sessionsPerWeek)} Einheiten · {d.startVolume.enduranceMinutes} min Ausdauer · {formatNumber(d.startVolume.runKm)} km ·{" "}
            {formatNumber(d.startVolume.strengthSessions)} × Kraft pro Woche
          </p>
          <Steps steps={d.startVolume.steps} />
        </div>
      )}

      <div className="space-y-1">
        <h3 className="font-semibold">R3 Screening</h3>
        <p>
          Testwoche {d.screening.testWeekAllowed ? "erlaubt" : "gesperrt"} · Maximaltests {d.screening.maxTestsAllowed ? "erlaubt" : "nicht erlaubt"}
        </p>
        <Steps steps={d.screening.steps} />
      </div>

      <div className="space-y-1">
        <h3 className="font-semibold">R4 Testwoche</h3>
        {d.testWeek.tests.length === 0 ? (
          <p className="muted">{d.testWeek.steps.join(" ")}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {d.testWeek.tests.map((t, i) => (
              <li key={i}>
                <span className="font-semibold">{t.label}</span> – {VARIANT[t.variant]}
                {t.protocol && `: ${t.protocol}`} <span className="text-slate-500">({t.reason})</span>
              </li>
            ))}
          </ul>
        )}
        <Steps steps={d.testWeek.steps} />
      </div>

      <div className="space-y-1">
        <h3 className="font-semibold">R5/R6 Kraft</h3>
        {d.strength.lifts.map((l) => (
          <div key={l.lift} className="space-y-0.5">
            <p className="text-sm">
              {l.e1rmKg != null
                ? `${l.lift === "squat" ? "Kniebeuge" : l.lift === "bench" ? "Bankdrücken" : "Kreuzheben"}: e1RM ${formatNumber(l.e1rmKg)} kg · ${l.loads.map((x) => `${x.label} ${formatNumber(x.kg)} kg`).join(" · ")}`
                : l.steps.at(-1)}
            </p>
            {l.e1rmKg != null && <Steps steps={l.steps} />}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <h3 className="font-semibold">R7 Paces (Riegel 1981)</h3>
        {d.paces ? (
          <>
            <ul className="text-sm">
              {d.paces.races.map((r) => (
                <li key={r.key}>
                  {r.label}: {formatDuration(r.seconds)} ({formatPace(r.paceSecPerKm)}){!r.inRange && " ⚠"}
                </li>
              ))}
              {d.paces.training.map((t) => (
                <li key={t.key}>
                  {t.label}: {t.fastSecPerKm === t.slowSecPerKm ? formatPace(t.fastSecPerKm) : `${formatPace(t.fastSecPerKm)} – ${formatPace(t.slowSecPerKm)}`}
                </li>
              ))}
              {d.paces.hyroxRacePaceSecPerKm != null && <li>Hyrox-Renn-Pace: {formatPace(d.paces.hyroxRacePaceSecPerKm)}</li>}
            </ul>
            <Steps steps={d.paces.steps} />
          </>
        ) : (
          <p className="muted">Keine Laufleistung als Referenz (5-km-Test, Meile, 30-min-Test oder Bestzeit).</p>
        )}
      </div>

      {d.hyrox && (
        <div className="space-y-1">
          <h3 className="font-semibold">R8 Hyrox-Gewichte ({d.hyrox.division})</h3>
          <p className="text-sm">
            Sled Push {d.hyrox.standards.sledPushKg} kg · Sled Pull {d.hyrox.standards.sledPullKg} kg · Farmers 2 × {d.hyrox.standards.farmersKgEach} kg ·
            Sandsack {d.hyrox.standards.sandbagKg} kg · Wall Ball {d.hyrox.standards.wallBallKg} kg auf{" "}
            {typeof d.hyrox.standards.wallBallTargetM === "number" ? `${formatNumber(d.hyrox.standards.wallBallTargetM, 2)} m` : d.hyrox.standards.wallBallTargetM}
          </p>
        </div>
      )}

      {d.heartRate && (
        <div className="space-y-1">
          <h3 className="font-semibold">R9 Herzfrequenz (HFmax {d.heartRate.hrMax})</h3>
          <p className="text-sm">{d.heartRate.zones.map((z) => `${z.percent} % = ${z.bpm}`).join(" · ")}</p>
        </div>
      )}

      {d.calories && (
        <div className="space-y-1">
          <h3 className="font-semibold">R10 Kalorien</h3>
          <p>
            {formatNumber(d.calories.totalKcal, 0)} kcal/Tag (Grundumsatz {formatNumber(d.calories.bmrKcal, 0)} kcal)
            {d.calories.palSuggestion != null && ` · PAL-Vorschlag DGE ${formatNumber(d.calories.palSuggestion, 2)}`}
          </p>
          <Steps steps={d.calories.steps} />
        </div>
      )}
    </section>
  );
}
