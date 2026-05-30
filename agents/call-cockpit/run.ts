// Call-Cockpit-Agent (Phase 0, Roadmap-Schritt 2).
// Liest Deals (Mock-Adapter) -> filtert BY/Daniel -> Spine-Anreicherung ->
// Priorisierung (Section 10) -> Teams-Tagesnachricht -> Datei-Artefakt.
//
// Aufruf: npm run cockpit  [-- --today=YYYY-MM-DD]

import { getDealsSource } from "../../mcp/brevo/adapter.ts";
import { enrichDeals } from "../../lib/spine/enrich.ts";
import { prioritize } from "../../lib/prioritization/index.ts";
import { todayIso } from "../../lib/prioritization/dates.ts";
import type { CockpitView } from "../../lib/teams/message.ts";
import { deliverToFiles, deliverToTeams } from "./deliver.ts";

function parseArgs(argv: string[]): { today: string } {
  let today = todayIso();
  for (const a of argv) {
    const m = a.match(/^--today=(\d{4}-\d{2}-\d{2})$/);
    if (m && m[1]) today = m[1];
  }
  return { today };
}

/** Baut die Cockpit-View. Exportiert, damit Tests sie ohne IO nutzen koennen. */
export async function buildCockpit(today: string): Promise<CockpitView> {
  const source = getDealsSource();
  // v1: nur Bayern / Daniel (Archetyp Proaktiv-Call). Section 3 + 10.
  const rawDeals = await source.fetchDeals({ bundesland: "BY" });
  const enriched = enrichDeals(rawDeals);
  const { items, capacity } = prioritize(enriched, { today });

  return {
    meta: { today, ownerName: "Daniel Schaefers", bundesland: "BY" },
    items,
    capacity,
  };
}

async function main(): Promise<void> {
  const { today } = parseArgs(process.argv.slice(2));
  const view = await buildCockpit(today);
  const result = deliverToFiles(view);

  // Konsolenausgabe = sofortige Vorfuehrbarkeit (Phase 0).
  console.log(result.markdown);
  console.log("\n----------------------------------------");
  console.log(`Artefakte geschrieben:`);
  console.log(`  Markdown:      ${result.markdownPath}`);
  console.log(`  Adaptive Card: ${result.cardPath}`);

  // Echte Teams-Zustellung, wenn TEAMS_WEBHOOK_URL gesetzt ist.
  try {
    const sent = await deliverToTeams(view);
    console.log(
      sent
        ? "  Teams:         zugestellt (Incoming Webhook)"
        : "  Teams:         uebersprungen (TEAMS_WEBHOOK_URL nicht gesetzt)",
    );
  } catch (err) {
    console.error("  Teams:         FEHLGESCHLAGEN -", (err as Error).message);
  }

  console.log(
    `Quelle: ${getDealsSource().name} | Worklist-Eintraege: ${view.items.length}`,
  );
}

// Nur ausfuehren, wenn direkt gestartet (nicht beim Import in Tests).
const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main().catch((err) => {
    console.error("Call-Cockpit fehlgeschlagen:", err);
    process.exit(1);
  });
}
