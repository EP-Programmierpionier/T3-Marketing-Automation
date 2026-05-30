// Brevo-Anbindung hinter einem Adapter-Interface (Projekt-Brief Section 10):
// Phase 0 laeuft gegen Mock-Daten (kein AVV noetig). Phase 1 haengt den echten
// REST-Client ein, ohne dass Agents/Priorisierung sich aendern.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Deal } from "../../lib/types.ts";

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
 * Phase 1: echter Brevo-REST-Client. Bewusst noch nicht implementiert -
 * benoetigt API-Key + AVV + exakte Stage-IDs/Custom-Field-Namen (offener
 * Punkt 12.2). Das Interface ist identisch, daher reines Einhaengen spaeter.
 */
export class RestBrevoAdapter implements DealsSource {
  readonly name = "brevo";
  constructor(private readonly apiKey: string) {}

  async fetchDeals(_filter?: DealsFilter): Promise<Deal[]> {
    if (!this.apiKey) throw new Error("BREVO_API_KEY fehlt.");
    throw new Error(
      "RestBrevoAdapter ist noch nicht implementiert (Phase 1). " +
        "Benoetigt: Brevo-AVV, exakte Deal-Stage-IDs und Custom-Field-Namen " +
        "(revenue_eur, produktlinie, bundesland, persona) - offener Punkt 12.2.",
    );
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
