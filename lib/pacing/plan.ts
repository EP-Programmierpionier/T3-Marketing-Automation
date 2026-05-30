// Plan-Helfer (Projekt-Brief Section 5 / Blueprint Section 8.2).
// Monats-Sales-Plan rampt linear Jan -> Dez; Produktlinien-Monatsziel = Jahr/12.

import { getPlanConfig } from "../config.ts";

const MONATE = [
  "Januar", "Februar", "Maerz", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export interface MonthPlan {
  index: number; // 1..12
  name: string;
  plan_eur: number;
}

/** Linearer Monatsplan zwischen Jan- und Dez-Wert (Section 5). */
export function monthlySalesPlan(monthIndex1to12: number): MonthPlan {
  const plan = getPlanConfig();
  const jan = plan.ziel_2026?.monats_sales_plan.jan_eur ?? 0;
  const dez = plan.ziel_2026?.monats_sales_plan.dez_eur ?? 0;
  const i = Math.min(12, Math.max(1, monthIndex1to12));
  const plan_eur = Math.round(jan + ((dez - jan) * (i - 1)) / 11);
  return { index: i, name: MONATE[i - 1] ?? `M${i}`, plan_eur };
}

/** Monats-Umsatzziel je Produktlinie (Jahresziel / 12). */
export function produktlinieMonthlyPlan(key: string): number {
  const pl = getPlanConfig().produktlinien[key];
  const jahr = pl?.umsatz_2026_eur ?? 0;
  return Math.round(jahr / 12);
}

/** Verfuegbare FTE im jeweiligen Halbjahr (H1 = Jan-Jun, sonst H2). */
export function fteForMonth(monthIndex1to12: number): number {
  const fte = getPlanConfig().fte_gesamt;
  return monthIndex1to12 <= 6 ? fte.h1_2026 : fte.h2_2026;
}
