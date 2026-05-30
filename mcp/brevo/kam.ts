// Datenquelle fuer die KAM-Pipeline (eigene Brevo-Pipeline, Blueprint 8.2b).
// Phase 0 = Mock-Fixture, Phase 1 = echter Brevo-REST (gated wie die Hauptpipeline).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { KamAccount } from "../../lib/kam/types.ts";

export interface KamSource {
  readonly name: string;
  fetchAccounts(): Promise<KamAccount[]>;
}

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_MOCK = join(here, "..", "..", "test", "mock-kam.json");

export class MockKamAdapter implements KamSource {
  readonly name = "mock";
  constructor(private readonly fixturePath: string = DEFAULT_MOCK) {}
  async fetchAccounts(): Promise<KamAccount[]> {
    return JSON.parse(readFileSync(this.fixturePath, "utf8")) as KamAccount[];
  }
}

/** Phase 1: echte KAM-Pipeline via Brevo-REST. Gated bis Pipeline-ID/Felder + AVV. */
export class RestKamAdapter implements KamSource {
  readonly name = "brevo-kam";
  constructor(private readonly apiKey: string) {}
  async fetchAccounts(): Promise<KamAccount[]> {
    if (!this.apiKey) throw new Error("BREVO_API_KEY fehlt.");
    throw new Error("RestKamAdapter noch nicht aktiviert (Phase 1): KAM-Pipeline-ID/Felder + AVV noetig.");
  }
}

export function getKamSource(): KamSource {
  const src = (process.env.KAM_SOURCE ?? "mock").toLowerCase();
  if (src === "brevo") return new RestKamAdapter(process.env.BREVO_API_KEY ?? "");
  return new MockKamAdapter();
}
