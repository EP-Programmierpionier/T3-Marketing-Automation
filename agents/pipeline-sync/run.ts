// Pipeline-Sync (Roadmap-Schritt 5, Blueprint Section 3E).
// Gleicht Projekt-Explorer (Money-Stages) mit Brevo-Deals ab und meldet
// Inkonsistenzen + Korrekturvorschlaege (kein Auto-Write in Phase 0).
//
// Aufruf: npm run pipeline-sync

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getDealsSource } from "../../mcp/brevo/adapter.ts";
import { getExplorerSource } from "../../mcp/projekt-explorer/adapter.ts";
import { reconcile, type Discrepancy } from "../../lib/pipeline-sync/reconcile.ts";
import { todayIso } from "../../lib/prioritization/dates.ts";

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, "..", "..", "out");

export async function buildReconciliation(): Promise<Discrepancy[]> {
  const [deals, angebote] = await Promise.all([
    getDealsSource().fetchDeals(),
    getExplorerSource().listAngebote(),
  ]);
  return reconcile(angebote, deals);
}

function render(today: string, d: Discrepancy[]): string {
  const L: string[] = [];
  L.push(`# Pipeline-Sync (Explorer <-> Brevo) - ${today}`);
  L.push("");
  if (d.length === 0) {
    L.push(`Keine Inkonsistenzen gefunden.`);
  } else {
    L.push(`${d.length} Inkonsistenz(en):`);
    L.push("");
    const groups: Record<string, Discrepancy[]> = {};
    for (const x of d) (groups[x.kind] ??= []).push(x);
    for (const [kind, items] of Object.entries(groups)) {
      L.push(`## ${kind} (${items.length})`);
      for (const it of items) {
        L.push(`- **${it.kommune}** (${it.deal_id}): ${it.detail}`);
        L.push(`  - Vorschlag: ${it.suggestion}`);
      }
      L.push("");
    }
  }
  L.push(`---`);
  L.push(`_Pipeline-Sync (Phase 0, Mock-Daten). Quelle: Blueprint Section 3E. Explorer-API = offener Punkt 12.4._`);
  return L.join("\n");
}

async function main(): Promise<void> {
  const today = todayIso();
  const discrepancies = await buildReconciliation();
  const md = render(today, discrepancies);
  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, `pipeline-sync-${today}.md`);
  writeFileSync(path, md, "utf8");
  console.log(md);
  console.log(`\n----------------------------------------\nReport geschrieben: ${path}`);
  console.log(`Quellen: brevo=${getDealsSource().name}, explorer=${getExplorerSource().name} | Inkonsistenzen: ${discrepancies.length}`);
}

const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main().catch((err) => {
    console.error("Pipeline-Sync fehlgeschlagen:", err);
    process.exit(1);
  });
}
