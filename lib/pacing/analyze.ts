// Conversion-Analyst: reine Pacing-Analyse (Blueprint Section 3D + 8.2).
// Ist (aus Deals/Spine) gegen Plan (Section 5) + Funnel-Soll (Section 3),
// segmentiert nach Bundesland/Persona, mit "zwei Uhren" (Lagging/Leading).
// Bewusst ohne IO -> unit-testbar.

import type { Bundesland, EnrichedDeal, Persona, StageKey } from "../types.ts";
import { getFunnelSollConfig, getPlanConfig, stageMap } from "../config.ts";
import { assessCapacity, type CapacitySignal } from "../prioritization/capacity.ts";
import { daysOverdue } from "../prioritization/dates.ts";
import { fteForMonth, monthlySalesPlan, produktlinieMonthlyPlan, type MonthPlan } from "./plan.ts";

export interface StageRow {
  stage: StageKey;
  label: string;
  count: number;
  eur: number;
}

export interface FunnelDriftRow {
  funnel_stage: number; // 1..7
  name: string;
  ist_count: number; // aktuelle Deals in dieser Funnel-Stufe (Snapshot)
  soll_pro_monat: number; // geplanter Monatsfluss (Section 3)
  ist_conv_to_next?: number; // Ist-Verhaeltnis naechste/aktuelle Stufe
  soll_conv_to_next?: number; // Soll-Verhaeltnis
}

export interface ProduktlinieRow {
  key: string;
  label: string;
  ist_eur: number;
  ist_stueck: number;
  plan_monat_eur: number;
  attainment_pct: number;
}

export interface SegStat {
  deals: number;
  open_eur: number;
  won_eur: number;
}

export interface PacingReport {
  asOf: string;
  month: MonthPlan;
  pipeline: StageRow[];
  pipeline_total_eur: number;
  won: { count: number; eur: number };
  pacing: { plan_month_eur: number; won_eur: number; attainment_pct: number };
  funnel_by: FunnelDriftRow[];
  produktlinien: ProduktlinieRow[];
  capacity: CapacitySignal;
  geko_per_day: number;
  segments: {
    bundesland: Record<Bundesland, SegStat>;
    persona: Record<Persona, SegStat>;
  };
  signals: { lagging: string[]; leading: string[] };
}

const PRODUKTLINIE_KEYS = ["bafa", "geko", "geko_light", "zusatz", "neu"] as const;

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function emptySeg(): SegStat {
  return { deals: 0, open_eur: 0, won_eur: 0 };
}

export function analyzePacing(deals: EnrichedDeal[], today: string): PacingReport {
  const sm = stageMap();
  const plan = getPlanConfig();
  const funnelSoll = getFunnelSollConfig();
  const monthIndex = Number(today.slice(5, 7));
  const month = monthlySalesPlan(monthIndex);

  // --- Pipeline je Stage ---
  const stageAgg = new Map<StageKey, StageRow>();
  for (const def of getStagesConfig_safe(sm)) {
    stageAgg.set(def.stage, { stage: def.stage, label: def.label, count: 0, eur: 0 });
  }
  for (const d of deals) {
    const row = stageAgg.get(d.stage);
    if (!row) continue;
    row.count += 1;
    row.eur += d.revenue_eur;
  }
  const pipeline = [...stageAgg.values()];
  const pipeline_total_eur = pipeline
    .filter((r) => r.stage !== "won" && r.stage !== "lost")
    .reduce((s, r) => s + r.eur, 0);

  // --- Won / Pacing (Lagging) ---
  const wonRows = deals.filter((d) => d.stage === "won");
  const won = { count: wonRows.length, eur: wonRows.reduce((s, d) => s + d.revenue_eur, 0) };
  const pacing = {
    plan_month_eur: month.plan_eur,
    won_eur: won.eur,
    attainment_pct: pct(won.eur, month.plan_eur),
  };

  // --- Funnel-Drift (nur BY, Section 3 Soll) ---
  const byDeals = deals.filter((d) => d.bundesland === "BY");
  const istByFunnelStage = new Map<number, number>();
  for (const d of byDeals) {
    const fs = sm.get(d.stage)?.funnel_stage ?? 0;
    if (fs >= 1 && fs <= 7) istByFunnelStage.set(fs, (istByFunnelStage.get(fs) ?? 0) + 1);
  }
  const funnel_by: FunnelDriftRow[] = funnelSoll.by_funnel_soll.map((s) => ({
    funnel_stage: s.stage,
    name: s.name,
    ist_count: istByFunnelStage.get(s.stage) ?? 0,
    soll_pro_monat: s.pro_monat,
  }));
  for (let i = 0; i < funnel_by.length - 1; i++) {
    const cur = funnel_by[i]!;
    const next = funnel_by[i + 1]!;
    cur.ist_conv_to_next = cur.ist_count > 0 ? round2(next.ist_count / cur.ist_count) : undefined;
    cur.soll_conv_to_next = cur.soll_pro_monat > 0 ? round2(next.soll_pro_monat / cur.soll_pro_monat) : undefined;
  }

  // --- € je Produktlinie (Ist vs Plan/Monat) ---
  const produktlinien: ProduktlinieRow[] = PRODUKTLINIE_KEYS.map((key) => {
    const istDeals = deals.filter((d) => d.produktlinie === key && d.stage !== "lost");
    const ist_eur = istDeals.reduce((s, d) => s + d.revenue_eur, 0);
    const ist_stueck = istDeals.reduce(
      (s, d) => s + (d.n_bafa ?? 0) + (d.n_geko ?? 0) + (d.n_geko_light ?? 0),
      0,
    );
    const plan_monat_eur = produktlinieMonthlyPlan(key);
    return {
      key,
      label: plan.produktlinien[key]?.label ?? key,
      ist_eur,
      ist_stueck,
      plan_monat_eur,
      attainment_pct: pct(ist_eur, plan_monat_eur),
    };
  });

  // --- Kapazitaet (Back-Pace) ---
  const capacity = assessCapacity(deals, fteForMonth(monthIndex));
  const gekoPerDay = plan.produktlinien.geko?.kapazitaet_berichte_pro_produktivtag ?? 2;

  // --- Segmentierung ---
  const bundesland: Record<Bundesland, SegStat> = { BW: emptySeg(), BY: emptySeg() };
  const persona: Record<Persona, SegStat> = {
    klima_energiemanager: emptySeg(),
    bauamt: emptySeg(),
    buergermeister: emptySeg(),
    kaemmerei: emptySeg(),
  };
  for (const d of deals) {
    const isWon = d.stage === "won";
    const isOpen = d.stage !== "won" && d.stage !== "lost";
    for (const seg of [bundesland[d.bundesland], persona[d.persona]]) {
      seg.deals += 1;
      if (isWon) seg.won_eur += d.revenue_eur;
      if (isOpen) seg.open_eur += d.revenue_eur;
    }
  }

  // --- Signale (zwei Uhren) ---
  const lagging: string[] = [];
  lagging.push(
    `Won ${won.eur.toLocaleString("de-DE")} EUR vs Monatsplan ${month.plan_eur.toLocaleString("de-DE")} EUR (${pacing.attainment_pct}%).`,
  );
  const angebot = stageAgg.get("angebot_versendet");
  if (angebot && angebot.count > 0) {
    lagging.push(
      `Close-Queue: ${angebot.count} offene Angebote (${angebot.eur.toLocaleString("de-DE")} EUR), ~50% Conversion erwartbar.`,
    );
  }

  const leading: string[] = [];
  const overdue = deals.filter((d) => daysOverdue(d.due_date, today) > 0).length;
  if (overdue > 0) leading.push(`${overdue} ueberfaellige Next-Actions (durchrutschende Follow-ups).`);
  const backlog = stageAgg.get("neu_webinar");
  if (backlog) leading.push(`Reach-out-Backlog: ${backlog.count} in "Neu / Webinarteilnahme".`);
  const datenAngefragt = stageAgg.get("daten_angefragt")?.count ?? 0;
  const datenErhalten = stageAgg.get("daten_erhalten")?.count ?? 0;
  if (datenAngefragt > 0 && datenErhalten === 0) {
    leading.push(`Daten-Stau: ${datenAngefragt}x "Daten angefragt" / 0x "Daten erhalten" -> Chase-Hebel.`);
  }
  const q = funnelSoll.tagesquote;
  leading.push(`Tagesquote-Ziel: min. ${q.min_anrufe_pro_tag} Anrufe + ${q.min_gespraeche_pro_tag} Gespraech/Tag.`);
  if (capacity.bafaFull) {
    leading.push(`Kapazitaets-Klippe: BAFA-Slot voll (${capacity.openBafaDeals}/${capacity.monthlyBafaCapacity}) -> GEKO vorziehen.`);
  }

  return {
    asOf: today,
    month,
    pipeline,
    pipeline_total_eur,
    won,
    pacing,
    funnel_by,
    produktlinien,
    capacity,
    geko_per_day: gekoPerDay,
    segments: { bundesland, persona },
    signals: { lagging, leading },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Stage-Reihenfolge stabil aus der Config (statt Map-Iterationsreihenfolge zu raten).
function getStagesConfig_safe(sm: Map<StageKey, { key: StageKey; label: string }>): {
  stage: StageKey;
  label: string;
}[] {
  return [...sm.values()].map((s) => ({ stage: s.key, label: s.label }));
}
