// Reine Mapping-Funktionen Brevo-API -> kanonisches Deal-Modell.
// Bewusst ohne Netzwerk/IO, damit sie unit-testbar sind (test/brevo-mapping.test.ts).

import type { Bundesland, Deal, NextActionKind, Produktlinie, StageKey } from "../../lib/types.ts";
import type { BrevoMappingConfig } from "../../lib/config.ts";

/** Roh-Strukturen der Brevo-CRM-API (nur die genutzten Felder). */
export interface BrevoDeal {
  id: string;
  attributes: Record<string, unknown>; // deal_name, amount, pipeline, deal_stage (id), + custom
  linkedContactsIds?: number[];
}

export interface BrevoContact {
  id: number;
  email: string;
  attributes: Record<string, unknown>; // FIRSTNAME, LASTNAME, + custom (z.B. FUNKTION)
}

export interface BrevoTask {
  id: string;
  name?: string;
  taskTypeId?: string;
  taskTypeName?: string; // vom Client aufgeloest
  date?: string; // Faelligkeit (ISO)
  done?: boolean;
  dealsIds?: string[];
}

/** Aus offenen/erledigten Tasks abgeleiteter Next-Action-Kontext fuer einen Deal. */
export interface DealTaskContext {
  next_action?: NextActionKind;
  due_date?: string; // frueheste offene Task-Faelligkeit
  last_activity?: string; // juengste (offene oder erledigte) Task-Aktivitaet
}

function isoDate(v: unknown): string | undefined {
  if (typeof v !== "string" || v.length < 10) return undefined;
  return v.slice(0, 10);
}

function num(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}

function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return undefined;
}

/** Loest Stage-Label -> kanonischen StageKey (sonst Fallback "alt"). */
export function mapStageLabel(label: string | undefined, cfg: BrevoMappingConfig): StageKey {
  if (label && cfg.stage_label_to_key[label]) return cfg.stage_label_to_key[label]!;
  return "alt";
}

/**
 * Verdichtet die Task-Liste eines Deals zu Next-Action/Faelligkeit/last_activity.
 * - due_date/next_action = frueheste OFFENE Task.
 * - last_activity = juengstes Task-Datum (offen oder erledigt).
 */
export function summarizeTasks(tasks: BrevoTask[], cfg: BrevoMappingConfig): DealTaskContext {
  const open = tasks.filter((t) => !t.done && t.date).sort((a, b) => (a.date! < b.date! ? -1 : 1));
  const dated = tasks.filter((t) => t.date).sort((a, b) => (a.date! > b.date! ? -1 : 1));

  const ctx: DealTaskContext = {};
  const earliestOpen = open[0];
  if (earliestOpen) {
    ctx.due_date = isoDate(earliestOpen.date);
    const typeName = earliestOpen.taskTypeName;
    ctx.next_action = (typeName && cfg.task_type_to_action[typeName]) || "todo";
  }
  const latest = dated[0];
  if (latest) ctx.last_activity = isoDate(latest.date);
  return ctx;
}

/**
 * Mappt einen Brevo-Deal (+ verknuepfter Kontakt + Task-Kontext) auf unser Deal-Modell.
 * Die Attribut-Namen kommen aus config/brevo-mapping.yaml (Custom-Field-Namen, 12.2).
 */
export function mapBrevoDeal(
  raw: BrevoDeal,
  contact: BrevoContact | undefined,
  taskCtx: DealTaskContext,
  cfg: BrevoMappingConfig,
  stageLabel: string | undefined,
): Deal {
  const a = raw.attributes ?? {};
  const map = cfg.attributes;
  const get = (key: string): unknown => a[map[key] ?? key];

  const firstName = str(contact?.attributes?.["FIRSTNAME"]) ?? "";
  const lastName = str(contact?.attributes?.["LASTNAME"]) ?? "";
  const name = `${firstName} ${lastName}`.trim() || str(contact?.email) || "Unbekannt";
  const funktion = str(contact?.attributes?.["FUNKTION"]) ?? str(contact?.attributes?.["funktion"]);

  const bundeslandRaw = str(get("bundesland"))?.toUpperCase();
  const bundesland: Bundesland = bundeslandRaw === "BY" ? "BY" : "BW";

  return {
    id: raw.id,
    deal_url: `https://app.brevo.com/crm/deals/${raw.id}`,
    kommune: str(get("kommune")) ?? "Unbekannt",
    bundesland,
    einwohner: num(get("einwohner")),
    owner: str(a["deal_owner"]) ?? "",
    stage: mapStageLabel(stageLabel, cfg),
    contact: { name, funktion, email: contact?.email ?? "" },
    persona: undefined, // wird im Spine aus funktion abgeleitet, falls leer
    revenue_eur: num(get("revenue_eur")) ?? 0,
    produktlinie: str(get("produktlinie")) as Produktlinie | undefined,
    n_bafa: num(get("n_bafa")),
    n_geko: num(get("n_geko")),
    n_geko_light: num(get("n_geko_light")),
    next_action: taskCtx.next_action,
    due_date: taskCtx.due_date,
    last_activity: taskCtx.last_activity,
    webinar_date: isoDate(get("webinar_date")),
    consent_state: str(get("consent_state")) as Deal["consent_state"],
  };
}
