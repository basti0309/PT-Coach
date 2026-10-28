// PAL-Vorschlag aus Beruf/Alltag nach der DGE-Tabelle (DGE/ÖGE, Referenzwerte für die Nährstoffzufuhr,
// 3. Auflage 2025; dge.de › FAQ Energiezufuhr, Stand 10.09.2025).
import { formatNumber } from "@/lib/format";
import type { WorkActivity } from "@/lib/questionnaire/schema";

export const DGE_PAL: Record<WorkActivity, { min: number; max: number; label: string }> = {
  liegend: { min: 1.2, max: 1.3, label: "ausschließlich sitzende oder liegende Lebensweise" },
  sitzend: { min: 1.4, max: 1.5, label: "ausschließlich sitzende Tätigkeit, wenig oder keine anstrengende Freizeitaktivität (z. B. Büro)" },
  sitzend_gehend: { min: 1.6, max: 1.7, label: "sitzende Tätigkeit, zeitweilig gehend/stehend (z. B. Labor, Studium, Fließband)" },
  gehend_stehend: { min: 1.8, max: 1.9, label: "überwiegend gehende und stehende Arbeit (z. B. Verkauf, Service, Handwerk)" },
  schwer: { min: 2.0, max: 2.4, label: "körperlich anstrengende Arbeit oder sehr aktive Freizeit (z. B. Bau, Landwirtschaft)" },
};

/** DGE: „Wer sportlich aktiv ist … (30–60 Minuten, 4- bis 5-mal je Woche), kann zusätzlich pro Tag 0,3 PAL-Einheiten … hinzurechnen.“ */
export const DGE_SPORT_BONUS = 0.3;
/** Obergrenze der Datenbank (client_profiles.pal_factor) */
export const PAL_MAX = 2.5;

/** Vorschlag = Untergrenze der Spanne (Festlegung, konservativ) + ggf. 0,3 für Sport. */
export function suggestPal(work: WorkActivity, sportOften: boolean): { pal: number; steps: string[] } {
  const band = DGE_PAL[work];
  const f = (n: number) => formatNumber(n, 2);
  const raw = band.min + (sportOften ? DGE_SPORT_BONUS : 0);
  const pal = Math.min(PAL_MAX, Math.round(raw * 100) / 100);
  return {
    pal,
    steps: [
      `DGE-Spanne „${band.label}“: ${f(band.min)}–${f(band.max)}; Vorschlag = Untergrenze ${f(band.min)}`,
      sportOften
        ? `Sport 4–5× pro Woche à 30–60 min: + ${f(DGE_SPORT_BONUS)} → ${f(raw)}${raw > PAL_MAX ? ` (begrenzt auf ${f(PAL_MAX)})` : ""}`
        : "kein Sportzuschlag",
    ],
  };
}
