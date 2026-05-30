// Projekt-Explorer als Quelle der Money-Stages (Angebot geschrieben/angenommen,
// Datum, Betrag) - Blueprint Section 3E. Eigenbau-Tool; API/Export ist offener
// Punkt 12.4 -> echter Adapter gated. Phase 0 = Mock-Fixture.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export interface ExplorerAngebot {
  deal_id: string; // Verknuepfung zur Brevo-Deal-ID
  kommune: string;
  status: "geschrieben" | "angenommen";
  betrag_eur: number;
  datum: string; // ISO
}

export interface ProjektExplorerSource {
  readonly name: string;
  listAngebote(): Promise<ExplorerAngebot[]>;
}

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_MOCK = join(here, "..", "..", "test", "mock-explorer.json");

export class MockExplorerAdapter implements ProjektExplorerSource {
  readonly name = "mock";
  constructor(private readonly fixturePath: string = DEFAULT_MOCK) {}
  async listAngebote(): Promise<ExplorerAngebot[]> {
    return JSON.parse(readFileSync(this.fixturePath, "utf8")) as ExplorerAngebot[];
  }
}

/** Phase 1: echte Explorer-API/-Export. Gated bis Schnittstelle geklaert (12.4). */
export class RestExplorerAdapter implements ProjektExplorerSource {
  readonly name = "explorer";
  constructor(private readonly baseUrl: string) {}
  async listAngebote(): Promise<ExplorerAngebot[]> {
    throw new Error("RestExplorerAdapter noch nicht aktiviert (Phase 1): Explorer-API/Export offen (12.4).");
  }
}

export function getExplorerSource(): ProjektExplorerSource {
  const src = (process.env.EXPLORER_SOURCE ?? "mock").toLowerCase();
  if (src === "explorer") return new RestExplorerAdapter(process.env.EXPLORER_BASE_URL ?? "");
  return new MockExplorerAdapter();
}
