// Conversion-Analyst-Agent (Roadmap-Schritt 6, Blueprint Section 3D + 9).
// Liest die gesamte Pipeline (alle Bundeslaender) -> Spine-Anreicherung ->
// Pacing-Analyse (Ist vs Plan + Funnel-Drift + Kapazitaet + Segmente) ->
// Markdown-Report (Datei-Artefakt; Teams-Narrative spaeter Schicht 3).
//
// Aufruf: npm run pacing  [-- --today=YYYY-MM-DD]

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getDealsSource } from "../../mcp/brevo/adapter.ts";
import { enrichDeals } from "../../lib/spine/enrich.ts";
import { analyzePacing, type PacingReport } from "../../lib/pacing/analyze.ts";
import { renderPacingMarkdown } from "../../lib/pacing/report.ts";
import { todayIso } from "../../lib/prioritization/dates.ts";

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, "..", "..", "out");

function parseArgs(argv: string[]): { today: string } {
  let today = todayIso();
  for (const a of argv) {
    const m = a.match(/^--today=(\d{4}-\d{2}-\d{2})$/);
    if (m && m[1]) today = m[1];
  }
  return { today };
}

/** Baut den Pacing-Report. Exportiert fuer Tests (kein IO). */
export async function buildPacing(today: string): Promise<PacingReport> {
  const source = getDealsSource();
  const deals = enrichDeals(await source.fetchDeals()); // alle Bundeslaender
  return analyzePacing(deals, today);
}

async function main(): Promise<void> {
  const { today } = parseArgs(process.argv.slice(2));
  const report = await buildPacing(today);
  const md = renderPacingMarkdown(report);

  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, `pacing-${today}.md`);
  writeFileSync(path, md, "utf8");
  const jsonPath = join(OUT_DIR, `pacing-${today}.json`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");

  console.log(md);
  console.log("\n----------------------------------------");
  console.log(`Report geschrieben: ${path}`);
  console.log(`Daten: ${jsonPath}`);
  console.log(`Quelle: ${getDealsSource().name}`);
}

const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main().catch((err) => {
    console.error("Conversion-Analyst fehlgeschlagen:", err);
    process.exit(1);
  });
}
