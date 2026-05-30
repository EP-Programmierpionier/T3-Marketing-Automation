// KAM-Manager (Roadmap-Schritt 5, Blueprint Section 8.2b).
// Zweite Umsatz-Motion: Folgeauftraege bei Bestandskunden. Liefert KPIs
// (NRR, Folgeauftrags-Quote) + priorisierte KAM-Worklist.
//
// Aufruf: npm run kam  [-- --today=YYYY-MM-DD]

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getKamSource } from "../../mcp/brevo/kam.ts";
import { kamMetrics, type KamMetrics } from "../../lib/kam/metrics.ts";
import { kamWorklist, type KamWorkItem } from "../../lib/kam/worklist.ts";
import { todayIso } from "../../lib/prioritization/dates.ts";

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, "..", "..", "out");

export interface KamView {
  today: string;
  metrics: KamMetrics;
  worklist: KamWorkItem[];
}

export async function buildKam(today: string): Promise<KamView> {
  const accounts = await getKamSource().fetchAccounts();
  return { today, metrics: kamMetrics(accounts), worklist: kamWorklist(accounts, today) };
}

function render(v: KamView): string {
  const m = v.metrics;
  const L: string[] = [];
  L.push(`# KAM-Report (Folgeauftraege) - ${v.today}`);
  L.push("");
  L.push(`## KPIs`);
  L.push(`- Begleitete Kommunen: **${m.begleitete_kommunen}** | mit Folgeauftrag: ${m.mit_folgeauftrag}`);
  L.push(`- Folgeauftrags-Quote: **${m.folgeauftrags_quote_pct}%**`);
  L.push(`- NRR: **${m.nrr_pct}%** (Basis ${m.base_volume_eur.toLocaleString("de-DE")} + Expansion ${m.expansion_eur.toLocaleString("de-DE")} EUR)`);
  L.push(`- Offene Folge-Pipeline: ${m.offene_folge_eur.toLocaleString("de-DE")} EUR`);
  L.push("");
  L.push(`## Pipeline`);
  L.push(`| Stage | Accounts | Folge-EUR |`);
  L.push(`|---|--:|--:|`);
  for (const r of m.pipeline) L.push(`| ${r.label} | ${r.count} | ${r.folge_eur.toLocaleString("de-DE")} |`);
  L.push("");
  L.push(`## Worklist (priorisiert)`);
  if (v.worklist.length === 0) L.push(`_Keine offenen KAM-Aktionen._`);
  let i = 1;
  for (const w of v.worklist) {
    const od = w.overdue_days > 0 ? `**${w.overdue_days} Tage ueberfaellig**` : `${w.days_since_activity} Tage seit Aktivitaet`;
    L.push(`${i++}. **${w.account.kommune}** (${w.account.bundesland}) | ${w.kind} | ${od}`);
    L.push(`   - ${w.reasons.join(" | ")}`);
  }
  L.push("");
  L.push(`---`);
  L.push(`_KAM-Manager (Phase 0, Mock-Daten). Quelle: Blueprint Section 8.2b._`);
  return L.join("\n");
}

async function main(): Promise<void> {
  let today = todayIso();
  for (const a of process.argv.slice(2)) {
    const mt = a.match(/^--today=(\d{4}-\d{2}-\d{2})$/);
    if (mt && mt[1]) today = mt[1];
  }
  const view = await buildKam(today);
  const md = render(view);
  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, `kam-${today}.md`);
  writeFileSync(path, md, "utf8");
  console.log(md);
  console.log(`\n----------------------------------------\nReport geschrieben: ${path}\nQuelle: ${getKamSource().name}`);
}

const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main().catch((err) => {
    console.error("KAM-Manager fehlgeschlagen:", err);
    process.exit(1);
  });
}
