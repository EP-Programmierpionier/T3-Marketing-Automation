// KAM-Kennzahlen (Blueprint Section 8.2b): NRR + Folgeauftrags-Quote +
// Pipeline-Wert je Stage. Reine Funktionen, unit-testbar.

import type { KamAccount, KamStageKey } from "./types.ts";
import { getKamStagesConfig } from "../config.ts";

export interface KamStageRow {
  key: KamStageKey;
  label: string;
  count: number;
  folge_eur: number;
}

export interface KamMetrics {
  begleitete_kommunen: number;
  mit_folgeauftrag: number;
  folgeauftrags_quote_pct: number;
  base_volume_eur: number;
  expansion_eur: number; // gewonnene Folgeauftraege
  nrr_pct: number; // (Basis + Expansion) / Basis
  offene_folge_eur: number; // Pipeline (Folgebedarf + Folgeangebot)
  pipeline: KamStageRow[];
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

export function kamMetrics(accounts: KamAccount[]): KamMetrics {
  const stageDefs = getKamStagesConfig().stages;
  const labelOf = new Map(stageDefs.map((s) => [s.key, s.label]));
  const wonKeys = new Set(stageDefs.filter((s) => s.is_won).map((s) => s.key));

  const pipeline: KamStageRow[] = stageDefs.map((s) => ({
    key: s.key as KamStageKey,
    label: s.label,
    count: 0,
    folge_eur: 0,
  }));
  const rowByKey = new Map(pipeline.map((r) => [r.key, r]));

  let base_volume_eur = 0;
  let expansion_eur = 0;
  let mit_folgeauftrag = 0;
  let offene_folge_eur = 0;

  for (const a of accounts) {
    base_volume_eur += a.base_revenue_eur;
    const row = rowByKey.get(a.stage);
    if (row) {
      row.count += 1;
      row.folge_eur += a.folge_revenue_eur;
    }
    if (wonKeys.has(a.stage)) {
      expansion_eur += a.folge_revenue_eur;
      mit_folgeauftrag += 1;
    }
    if (a.stage === "folgebedarf_erkannt" || a.stage === "folgeangebot") {
      offene_folge_eur += a.folge_revenue_eur;
    }
  }

  const begleitete = accounts.length;
  return {
    begleitete_kommunen: begleitete,
    mit_folgeauftrag,
    folgeauftrags_quote_pct: pct(mit_folgeauftrag, begleitete),
    base_volume_eur,
    expansion_eur,
    nrr_pct: base_volume_eur > 0 ? Math.round(((base_volume_eur + expansion_eur) / base_volume_eur) * 1000) / 10 : 0,
    offene_folge_eur,
    pipeline,
  };
}
