// Brevo-Anbindung hinter einem Adapter-Interface (Projekt-Brief Section 10):
// Phase 0 laeuft gegen Mock-Daten (kein AVV noetig). Phase 1 haengt den echten
// REST-Client ein, ohne dass Agents/Priorisierung sich aendern.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Deal } from "../../lib/types.ts";
import { getBrevoMappingConfig } from "../../lib/config.ts";
import { BrevoClient } from "./rest.ts";
import {
  mapBrevoDeal,
  summarizeTasks,
  type BrevoTask,
} from "./mapping.ts";

/** Quelle der Wahrheit fuer Deals. Owner-Filter (z.B. nur Daniel/BY) optional. */
export interface DealsSource {
  readonly name: string;
  fetchDeals(filter?: DealsFilter): Promise<Deal[]>;
}

export interface DealsFilter {
  bundesland?: Deal["bundesland"];
  owner?: string;
}

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_MOCK = join(here, "..", "..", "test", "mock-deals.json");

/** Phase 0: liest Deals aus einer JSON-Fixture. */
export class MockBrevoAdapter implements DealsSource {
  readonly name = "mock";
  constructor(private readonly fixturePath: string = DEFAULT_MOCK) {}

  async fetchDeals(filter?: DealsFilter): Promise<Deal[]> {
    const raw = readFileSync(this.fixturePath, "utf8");
    const deals = JSON.parse(raw) as Deal[];
    return applyFilter(deals, filter);
  }
}

/**
 * Phase 1: echter Brevo-REST-Adapter. Code-complete; aktivierbar via
 * DEALS_SOURCE=brevo + BREVO_API_KEY. Stage-Labels und Custom-Field-Namen
 * kommen aus config/brevo-mapping.yaml (offener Punkt 12.2 -> dort bestaetigen).
 *
 * Ablauf: Pipeline-Stages laden (ID->Label) -> Deals laden -> Tasks je Deal
 * verdichten (Faelligkeit/Next-Action/last_activity) -> ersten verknuepften
 * Kontakt laden (E-Mail/Name/Funktion) -> auf unser Deal-Modell mappen.
 */
export class RestBrevoAdapter implements DealsSource {
  readonly name = "brevo";
  private readonly client: BrevoClient;
  constructor(apiKey: string, client?: BrevoClient) {
    this.client = client ?? new BrevoClient(apiKey);
  }

  async fetchDeals(filter?: DealsFilter): Promise<Deal[]> {
    const cfg = getBrevoMappingConfig();

    // 1) Pipeline + Stage-ID -> Label.
    const pipelines = await this.client.getPipelines();
    const pipeline =
      pipelines.find((p) => (cfg.pipeline_id && p.pipeline === cfg.pipeline_id)) ??
      pipelines.find((p) => p.pipeline_name === cfg.pipeline_name) ??
      pipelines[0];
    const stageIdToLabel = new Map<string, string>();
    for (const s of pipeline?.stages ?? []) stageIdToLabel.set(s.id, s.name);

    // 2) Tasks einmal laden und je Deal gruppieren.
    const tasks = await this.client.listTasks();
    const tasksByDeal = new Map<string, BrevoTask[]>();
    for (const t of tasks) {
      for (const dealId of t.dealsIds ?? []) {
        const arr = tasksByDeal.get(dealId) ?? [];
        arr.push(t);
        tasksByDeal.set(dealId, arr);
      }
    }

    // 3) Deals laden und mappen.
    const rawDeals = await this.client.listDeals();
    const deals: Deal[] = [];
    for (const raw of rawDeals) {
      const pipelineId = raw.attributes?.["pipeline"];
      // Nur Deals der Ziel-Pipeline.
      if (pipeline && pipelineId && pipelineId !== pipeline.pipeline) continue;

      const stageLabel = stageIdToLabel.get(String(raw.attributes?.["deal_stage"] ?? ""));
      const taskCtx = summarizeTasks(tasksByDeal.get(raw.id) ?? [], cfg);
      const contactId = raw.linkedContactsIds?.[0];
      const contact = contactId ? await this.client.getContact(contactId) : undefined;

      deals.push(mapBrevoDeal(raw, contact, taskCtx, cfg, stageLabel));
    }

    return applyFilter(deals, filter);
  }
}

function applyFilter(deals: Deal[], filter?: DealsFilter): Deal[] {
  if (!filter) return deals;
  return deals.filter((d) => {
    if (filter.bundesland && d.bundesland !== filter.bundesland) return false;
    if (filter.owner && d.owner !== filter.owner) return false;
    return true;
  });
}

/** Waehlt die Quelle anhand DEALS_SOURCE (mock|brevo). */
export function getDealsSource(): DealsSource {
  const src = (process.env.DEALS_SOURCE ?? "mock").toLowerCase();
  if (src === "brevo") return new RestBrevoAdapter(process.env.BREVO_API_KEY ?? "");
  return new MockBrevoAdapter();
}
