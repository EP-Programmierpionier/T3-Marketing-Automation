// KAM-Worklist: priorisierte Folgeauftrags-Chancen.
// Reihenfolge analog Cockpit: ueberfaellig zuerst -> Folgeangebot (EUR) ->
// Folgebedarf (nach Account-Wert). Park/Won/Lost werden ausgeschlossen.

import type { KamAccount } from "./types.ts";
import { getKamStagesConfig } from "../config.ts";
import { daysOverdue, daysSince } from "../prioritization/dates.ts";

export interface KamWorkItem {
  account: KamAccount;
  kind: "close" | "work";
  score: number;
  overdue_days: number;
  days_since_activity: number;
  reasons: string[];
}

const OVERDUE_TIER = 1_000_000;
const KIND_BASE = { close: 400_000, work: 300_000 } as const;

export function kamWorklist(accounts: KamAccount[], today: string): KamWorkItem[] {
  const stageKind = new Map(getKamStagesConfig().stages.map((s) => [s.key, s.kind]));
  const maxFolge = Math.max(
    1,
    ...accounts.filter((a) => stageKind.get(a.stage) === "close").map((a) => a.folge_revenue_eur),
  );
  const maxBase = Math.max(1, ...accounts.map((a) => a.base_revenue_eur));

  const items: KamWorkItem[] = [];
  for (const a of accounts) {
    const kind = stageKind.get(a.stage);
    if (kind !== "close" && kind !== "work") continue;

    const overdue = daysOverdue(a.due_date, today);
    const sinceAct = daysSince(a.last_activity, today);
    const reasons: string[] = [];
    let score = 0;

    if (overdue > 0) {
      score += OVERDUE_TIER + Math.min(overdue, 120) * 1500;
      reasons.push(`${overdue} Tage ueberfaellig`);
    }
    score += KIND_BASE[kind];

    if (kind === "close") {
      score += (a.folge_revenue_eur / maxFolge) * 90_000;
      reasons.push(`Folgeangebot ${a.folge_revenue_eur.toLocaleString("de-DE")} EUR -> nachfassen`);
    } else {
      score += (a.base_revenue_eur / maxBase) * 90_000;
      reasons.push(`Folgebedarf erkannt (Basisvolumen ${a.base_revenue_eur.toLocaleString("de-DE")} EUR)`);
    }

    items.push({
      account: a,
      kind,
      score: Math.round(score),
      overdue_days: overdue,
      days_since_activity: sinceAct,
      reasons,
    });
  }
  items.sort((x, y) => y.score - x.score);
  return items;
}
