// Laedt die YAML-Konfigurationen aus /config. Zentral, damit Agents/Skills
// dieselbe Quelle der Wahrheit nutzen (Section 11: /config).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import yaml from "js-yaml";
import type { NextActionKind, Queue, StageKey } from "./types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(here, "..", "config");

function loadYaml<T>(name: string): T {
  const raw = readFileSync(join(CONFIG_DIR, name), "utf8");
  return yaml.load(raw) as T;
}

export interface StageDef {
  key: StageKey;
  label: string;
  queue: Queue;
  funnel_stage: number;
  is_money_stage: boolean;
}

export interface StagesConfig {
  stages: StageDef[];
}

export interface PrioritizationConfig {
  weights: {
    overdue_tier: number;
    overdue_day_weight: number;
    overdue_day_cap_days: number;
    queue: Record<Queue, number>;
    internal_max: number;
    data_chase_day_weight: number;
    data_chase_day_cap_days: number;
    reachout_icp_weight: number;
    reachout_webinar_recency_weight: number;
    webinar_recency_window_days: number;
    capacity_geko_boost: number;
  };
  capacity: {
    bafa_full_threshold_factor: number;
  };
}

export interface FunnelSollConfig {
  archetypes: Record<string, { name: string; mechanik: string; call_cockpit: boolean }>;
  by_funnel_soll: { stage: number; name: string; pro_monat: number }[];
  tagesquote: { min_anrufe_pro_tag: number; min_gespraeche_pro_tag: number };
}

export interface PlanConfig {
  ist_2025?: { projekte: number; umsatz_eur: number };
  ziel_2026?: {
    ziellinie_top_down_eur: number;
    bottom_up_eur: number;
    monats_sales_plan: { jan_eur: number; dez_eur: number };
  };
  produktlinien: Record<
    string,
    {
      label: string;
      durchschnitt_eur: number;
      umsatz_2026_eur?: number;
      kapazitaet_berichte_pro_fte_monat?: number;
      kapazitaet_berichte_pro_produktivtag?: number;
    }
  >;
  fte_gesamt: { ist_2025: number; h1_2026: number; h2_2026: number };
}

export interface BrevoMappingConfig {
  pipeline_name: string;
  pipeline_id: string;
  stage_label_to_key: Record<string, StageKey>;
  attributes: Record<string, string>;
  task_type_to_action: Record<string, NextActionKind>;
}

let _stages: StagesConfig | undefined;
let _prio: PrioritizationConfig | undefined;
let _funnel: FunnelSollConfig | undefined;
let _plan: PlanConfig | undefined;
let _brevo: BrevoMappingConfig | undefined;

export function getStagesConfig(): StagesConfig {
  return (_stages ??= loadYaml<StagesConfig>("stages.yaml"));
}

export function getPrioritizationConfig(): PrioritizationConfig {
  return (_prio ??= loadYaml<PrioritizationConfig>("prioritization.yaml"));
}

export function getFunnelSollConfig(): FunnelSollConfig {
  return (_funnel ??= loadYaml<FunnelSollConfig>("funnel-soll.yaml"));
}

export function getPlanConfig(): PlanConfig {
  return (_plan ??= loadYaml<PlanConfig>("plan-2026.yaml"));
}

export function getBrevoMappingConfig(): BrevoMappingConfig {
  return (_brevo ??= loadYaml<BrevoMappingConfig>("brevo-mapping.yaml"));
}

/** Lookup-Map StageKey -> StageDef. */
export function stageMap(): Map<StageKey, StageDef> {
  const m = new Map<StageKey, StageDef>();
  for (const s of getStagesConfig().stages) m.set(s.key, s);
  return m;
}
