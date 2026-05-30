// Kapazitaets-Hinweis (Section 5 + 10, Schritt 5):
// BAFA-Stueckzahl folgt der FTE-Kapazitaet (3,5 Berichte/FTE/Monat), nicht der
// Nachfrage. Wenn die offenen BAFA-Deals die Monatskapazitaet erreichen, gilt
// der BAFA-Slot als voll -> GEKO/GEKO-light-Leads werden leicht bevorzugt.

import type { EnrichedDeal } from "../types.ts";
import { getPlanConfig, getPrioritizationConfig, stageMap } from "../config.ts";

export interface CapacitySignal {
  bafaFull: boolean;
  openBafaDeals: number;
  monthlyBafaCapacity: number;
  fte: number;
}

/**
 * Schaetzt die BAFA-Auslastung aus den offenen Deals.
 * "offen + relevant" = aktive Stages ab Funnel-Stage 2 (im Gespraech) bis
 * Angebot, mit BAFA-Anteil (n_bafa > 0 oder produktlinie=bafa).
 */
export function assessCapacity(
  deals: EnrichedDeal[],
  fteOverride?: number,
): CapacitySignal {
  const plan = getPlanConfig();
  const prio = getPrioritizationConfig();
  const sm = stageMap();

  const fte = fteOverride ?? plan.fte_gesamt.h1_2026; // 2026 H1 als Default (Stand-Brief)
  const perFte = plan.produktlinien.bafa?.kapazitaet_berichte_pro_fte_monat ?? 3.5;
  const monthlyBafaCapacity = Math.round(fte * perFte * 10) / 10;

  const openBafaDeals = deals.filter((d) => {
    const def = sm.get(d.stage);
    const active = def !== undefined && def.funnel_stage >= 2 && def.funnel_stage <= 6;
    const isBafa = (d.n_bafa ?? 0) > 0 || d.produktlinie === "bafa";
    return active && isBafa;
  }).length;

  const bafaFull =
    openBafaDeals >= monthlyBafaCapacity * prio.capacity.bafa_full_threshold_factor;

  return { bafaFull, openBafaDeals, monthlyBafaCapacity, fte };
}
