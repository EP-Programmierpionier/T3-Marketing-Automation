// Call-Cockpit-Priorisierung (Projekt-Brief Section 10).
// Tiered/lexikographische Ordnung, abgebildet als EIN sortierbarer Score:
//   1. Ueberfaellige zuerst        (overdue_tier, additiv)
//   2. Close-Queue (EUR-gewichtet)
//   3. Reach-out (ICP-Fit + Webinar-Aktualitaet)
//   4. Daten-Chase (Wartezeit)
//   5. Kapazitaets-Boost fuer GEKO, wenn BAFA-Slot voll
//
// park-Stages (Won/Lost/Alt/Warten/Termin steht) werden NICHT in die
// Worklist aufgenommen.

import type { EnrichedDeal, PrioritizedItem, Queue } from "../types.ts";
import { getPrioritizationConfig, stageMap } from "../config.ts";
import { assessCapacity, type CapacitySignal } from "./capacity.ts";
import { daysOverdue, daysSince } from "./dates.ts";
import { generateOpener } from "../texting/opener.ts";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Webinar-Aktualitaet 0..1 (frisch = 1, nach window_days -> 0). */
function webinarRecency(webinarDate: string | undefined, today: string, windowDays: number): number {
  if (!webinarDate) return 0;
  const age = daysSince(webinarDate, today);
  return clamp(1 - age / windowDays, 0, 1);
}

export interface PrioritizeOptions {
  today: string;
  /** maximale EUR im Datensatz fuer Normalisierung der Close-Queue. */
  fteOverride?: number;
}

export interface PrioritizeResult {
  items: PrioritizedItem[];
  capacity: CapacitySignal;
}

/**
 * Klassifiziert + scored alle Deals und liefert die sortierte Worklist.
 */
export function prioritize(deals: EnrichedDeal[], opts: PrioritizeOptions): PrioritizeResult {
  const w = getPrioritizationConfig().weights;
  const sm = stageMap();
  const today = opts.today;
  const capacity = assessCapacity(deals, opts.fteOverride);

  // Hoechsten Deal-Betrag fuer Close-Queue-Normalisierung ermitteln.
  const maxRevenue = Math.max(
    1,
    ...deals
      .filter((d) => sm.get(d.stage)?.queue === "close")
      .map((d) => d.revenue_eur),
  );

  const items: PrioritizedItem[] = [];

  for (const deal of deals) {
    const def = sm.get(deal.stage);
    const queue: Queue = def?.queue ?? "park";
    if (queue === "park") continue; // nicht aktiv anrufen

    const overdue = daysOverdue(deal.due_date, today);
    const daysAct = daysSince(deal.last_activity, today);
    const reasons: string[] = [];

    let score = 0;

    // Tier 1: Ueberfaellige zuerst.
    if (overdue > 0) {
      const cappedDays = Math.min(overdue, w.overdue_day_cap_days);
      score += w.overdue_tier + cappedDays * w.overdue_day_weight;
      reasons.push(`${overdue} Tage ueberfaellig`);
    }

    // Tier 2: Queue-Basis.
    score += w.queue[queue];

    // Interne Komponente je Queue (0..internal_max).
    let internal = 0;
    if (queue === "close") {
      const ratio = clamp(deal.revenue_eur / maxRevenue, 0, 1);
      internal = ratio * w.internal_max;
      reasons.push(`Offenes Angebot ${deal.revenue_eur.toLocaleString("de-DE")} EUR`);
    } else if (queue === "reachout") {
      const rec = webinarRecency(deal.webinar_date, today, w.webinar_recency_window_days);
      const blend =
        deal.icp_fit * w.reachout_icp_weight + rec * w.reachout_webinar_recency_weight;
      internal = clamp(blend, 0, 1) * w.internal_max;
      reasons.push(`ICP-Fit ${deal.icp_fit.toFixed(2)}`);
      if (rec > 0) reasons.push(`Webinar-Aktualitaet ${rec.toFixed(2)}`);
    } else if (queue === "data_chase") {
      const waitDays = Math.min(daysAct, w.data_chase_day_cap_days);
      internal = clamp(waitDays * w.data_chase_day_weight, 0, w.internal_max);
      reasons.push(`Wartet auf Daten-Ruecklauf (${daysAct} Tage seit letzter Aktivitaet)`);
    }
    score += internal;

    // Tier 5: Kapazitaets-Boost fuer GEKO, wenn BAFA-Slot voll.
    const isGeko =
      (deal.n_geko ?? 0) > 0 ||
      (deal.n_geko_light ?? 0) > 0 ||
      deal.produktlinie === "geko" ||
      deal.produktlinie === "geko_light";
    if (capacity.bafaFull && isGeko) {
      score += w.capacity_geko_boost;
      reasons.push("Kapazitaet: BAFA-Slot voll -> GEKO bevorzugt");
    }

    items.push({
      deal,
      queue,
      score: Math.round(score),
      overdue_days: overdue,
      days_since_activity: daysAct,
      reasons,
      opener: generateOpener(deal, queue),
    });
  }

  items.sort((a, b) => b.score - a.score);
  return { items, capacity };
}
