// Grundumsatz nach Mifflin-St Jeor und Gesamtbedarf mit PAL-Faktor.
import { formatNumber } from "@/lib/format";

export type Sex = "m" | "w";

export interface CalorieInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  pal: number;
}

export interface CalorieResult {
  bmr: number;
  total: number;
  /** Rechenweg zum Anzeigen */
  steps: string[];
}

/** Mifflin-St Jeor: 10·kg + 6,25·cm − 5·Alter + 5 (Männer) bzw. − 161 (Frauen) */
export function mifflinStJeor(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "m" ? 5 : -161);
}

export function calorieNeed(input: CalorieInput): CalorieResult {
  const { sex, weightKg, heightCm, age, pal } = input;
  const bmr = mifflinStJeor(sex, weightKg, heightCm, age);
  const total = bmr * pal;
  const f = (n: number) => formatNumber(n, 2);
  const constant = sex === "m" ? "+ 5" : "− 161";
  return {
    bmr,
    total,
    steps: [
      `Grundumsatz (Mifflin-St Jeor, ${sex === "m" ? "Männer" : "Frauen"}) = 10 × Gewicht + 6,25 × Größe − 5 × Alter ${constant}`,
      `= 10 × ${f(weightKg)} kg + 6,25 × ${f(heightCm)} cm − 5 × ${age} Jahre ${constant}`,
      `= ${f(10 * weightKg)} + ${f(6.25 * heightCm)} − ${f(5 * age)} ${constant} = ${f(bmr)} kcal`,
      `Gesamtbedarf = Grundumsatz × PAL = ${f(bmr)} × ${f(pal)} = ${f(total)} kcal`,
    ],
  };
}

export const PAL_OPTIONS: { value: number; label: string }[] = [
  { value: 1.2, label: "1,2 – fast nur sitzend/liegend" },
  { value: 1.4, label: "1,4 – sitzend, kaum Bewegung in der Freizeit" },
  { value: 1.6, label: "1,6 – sitzend, zeitweise gehend/stehend" },
  { value: 1.8, label: "1,8 – überwiegend gehend/stehend" },
  { value: 2.0, label: "2,0 – körperlich anstrengend" },
  { value: 2.2, label: "2,2 – sehr anstrengend / sehr viel Sport" },
];
