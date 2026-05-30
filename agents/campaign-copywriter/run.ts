// Campaign-Copywriter + Closed-Loop (Roadmap-Schritt 8, Blueprint Section 3C/3F).
// 1) leitet Copy-Hypothesen aus dem Pacing-Report ab (Conversion-Analyst)
// 2) erzeugt persona-segmentierte Newsletter-A/B-Varianten je Thema
//    (alle guardrail-geprueft, Direkt-Termin-CTA + UTM)
//
// Aufruf: npm run copy  [-- --today=YYYY-MM-DD]

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getThemenConfig } from "../../lib/config.ts";
import { buildNewsletterVariants } from "../../lib/copy/newsletter.ts";
import { deriveHypotheses } from "../../lib/copy/hypotheses.ts";
import type { CopyVariant, Hypothesis } from "../../lib/copy/types.ts";
import { buildPacing } from "../conversion-analyst/run.ts";
import { todayIso } from "../../lib/prioritization/dates.ts";

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, "..", "..", "out");

export interface CopyRun {
  today: string;
  hypotheses: Hypothesis[];
  variants: CopyVariant[];
}

export async function buildCopyRun(today: string): Promise<CopyRun> {
  const pacing = await buildPacing(today);
  const hypotheses = deriveHypotheses(pacing);

  const variants: CopyVariant[] = [];
  for (const thema of getThemenConfig().themen) {
    for (const persona of thema.personas) {
      variants.push(...buildNewsletterVariants(thema, persona));
    }
  }
  return { today, hypotheses, variants };
}

function render(run: CopyRun): string {
  const L: string[] = [];
  L.push(`# Campaign-Copywriter / Closed-Loop - ${run.today}`);
  L.push("");
  L.push(`## Hypothesen-Backlog (aus Pacing-Signalen)`);
  if (run.hypotheses.length === 0) L.push(`_Keine auffaelligen Signale -> kein Experiment vorgeschlagen._`);
  for (const h of run.hypotheses) {
    L.push(`### ${h.id}`);
    L.push(`- Signal: ${h.signal}`);
    L.push(`- Hypothese: ${h.hypothesis}`);
    L.push(`- Experiment: ${h.experiment}`);
    L.push(`- Leading-Metrik: ${h.leading_metric}`);
  }
  L.push("");
  L.push(`## Newsletter-Varianten (${run.variants.length}, A/B persona-segmentiert)`);
  L.push(`| Variant-ID | Persona | Strategie | Betreff |`);
  L.push(`|---|---|---|---|`);
  for (const v of run.variants) {
    L.push(`| ${v.variant_id} | ${v.persona} | ${v.strategy} | ${v.subject} |`);
  }
  L.push("");
  // Eine Beispiel-Variante vollstaendig zeigen.
  const sample = run.variants[0];
  if (sample) {
    L.push(`## Beispiel-Variante: ${sample.variant_id}`);
    L.push(`**Betreff:** ${sample.subject}`);
    L.push(`**CTA:** ${sample.cta_url}`);
    L.push("```");
    L.push(sample.body);
    L.push("```");
  }
  L.push("");
  L.push(`---`);
  L.push(`_Campaign-Copywriter (Phase 0). Quelle: Blueprint Section 3C/3F. Volltexte: copy-<datum>.json._`);
  return L.join("\n");
}

async function main(): Promise<void> {
  let today = todayIso();
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--today=(\d{4}-\d{2}-\d{2})$/);
    if (m && m[1]) today = m[1];
  }
  const run = await buildCopyRun(today);
  const md = render(run);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `copy-${today}.md`), md, "utf8");
  writeFileSync(join(OUT_DIR, `copy-${today}.json`), JSON.stringify(run, null, 2), "utf8");
  console.log(md);
  console.log(`\n----------------------------------------`);
  console.log(`Hypothesen: ${run.hypotheses.length} | Varianten: ${run.variants.length}`);
  console.log(`Artefakte: out/copy-${today}.md + .json`);
}

const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main().catch((err) => {
    console.error("Campaign-Copywriter fehlgeschlagen:", err);
    process.exit(1);
  });
}
