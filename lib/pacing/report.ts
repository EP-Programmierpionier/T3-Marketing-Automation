// Rendert den Pacing-Report als Markdown (Blueprint Section 9, Schicht 2/3).

import type { PacingReport } from "./analyze.ts";

function eur(n: number): string {
  return n.toLocaleString("de-DE") + " EUR";
}

export function renderPacingMarkdown(r: PacingReport): string {
  const L: string[] = [];

  L.push(`# Pacing-Report (Conversion-Analyst) - ${r.asOf}`);
  L.push(`Monat: **${r.month.name}** | Monatsplan **${eur(r.month.plan_eur)}**`);
  L.push("");

  // Zwei Uhren
  L.push(`## Zwei Uhren`);
  L.push(`**Lagging (Abschluss, ~6 Mon. Vorlauf):**`);
  for (const s of r.signals.lagging) L.push(`- ${s}`);
  L.push(`**Leading (Aktivitaets-Pace heute):**`);
  for (const s of r.signals.leading) L.push(`- ${s}`);
  L.push("");

  // Pacing
  const bar = attainmentBar(r.pacing.attainment_pct);
  L.push(`## Monats-Pacing`);
  L.push(`Won ${eur(r.pacing.won_eur)} / Plan ${eur(r.pacing.plan_month_eur)} = **${r.pacing.attainment_pct}%** ${bar}`);
  L.push(`_Hinweis: Won-Monatszuordnung braucht Abschluss-Datum (Phase 1); hier Gesamt-Won der Fixture._`);
  L.push("");

  // Pipeline
  L.push(`## Pipeline (Snapshot)`);
  L.push(`| Stage | Deals | EUR |`);
  L.push(`|---|--:|--:|`);
  for (const s of r.pipeline) L.push(`| ${s.label} | ${s.count} | ${s.eur.toLocaleString("de-DE")} |`);
  L.push(`| **Offen gesamt** | | **${r.pipeline_total_eur.toLocaleString("de-DE")}** |`);
  L.push("");

  // Funnel-Drift (BY)
  L.push(`## Funnel-Soll vs Ist (Bayern, Section 3)`);
  L.push(`| # | Stufe | Ist (Snapshot) | Soll/Monat | Ist-Conv. -> | Soll-Conv. -> |`);
  L.push(`|--:|---|--:|--:|--:|--:|`);
  for (const f of r.funnel_by) {
    const ic = f.ist_conv_to_next !== undefined ? `x${f.ist_conv_to_next}` : "-";
    const sc = f.soll_conv_to_next !== undefined ? `x${f.soll_conv_to_next}` : "-";
    L.push(`| ${f.funnel_stage} | ${f.name} | ${f.ist_count} | ${f.soll_pro_monat} | ${ic} | ${sc} |`);
  }
  L.push("");

  // Produktlinien
  L.push(`## EUR je Produktlinie (Ist vs Plan/Monat)`);
  L.push(`| Linie | Ist EUR | Ist Stk | Plan/Monat | Attain. |`);
  L.push(`|---|--:|--:|--:|--:|`);
  for (const p of r.produktlinien) {
    L.push(`| ${p.label} | ${p.ist_eur.toLocaleString("de-DE")} | ${p.ist_stueck} | ${p.plan_monat_eur.toLocaleString("de-DE")} | ${p.attainment_pct}% |`);
  }
  L.push("");

  // Kapazitaet
  L.push(`## Kapazitaet (Back-Pace)`);
  const cap = r.capacity;
  L.push(
    `- BAFA: ${cap.openBafaDeals} offene Deals vs Kapazitaet ${cap.monthlyBafaCapacity}/Monat (${cap.fte} FTE) -> ${cap.bafaFull ? "**ausgelastet**" : "frei"}.`,
  );
  L.push(`- GEKO: ${r.geko_per_day} Berichte/Produktivtag (Liefer-Limit).`);
  L.push("");

  // Segmentierung
  L.push(`## Segmentierung`);
  L.push(`**Bundesland (BW/BY-Split aus Ist):**`);
  for (const [k, s] of Object.entries(r.segments.bundesland)) {
    L.push(`- ${k}: ${s.deals} Deals | offen ${s.open_eur.toLocaleString("de-DE")} EUR | won ${s.won_eur.toLocaleString("de-DE")} EUR`);
  }
  L.push(`**Persona:**`);
  for (const [k, s] of Object.entries(r.segments.persona)) {
    if (s.deals === 0) continue;
    L.push(`- ${k}: ${s.deals} Deals | offen ${s.open_eur.toLocaleString("de-DE")} EUR`);
  }
  L.push("");
  L.push(`---`);
  L.push(`_Conversion-Analyst (Phase 0, Mock-Daten). Quelle: Brief Section 5 + Blueprint Section 8.2/9._`);
  return L.join("\n");
}

function attainmentBar(pct: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(pct / 10)));
  return "[" + "#".repeat(filled) + ".".repeat(10 - filled) + "]";
}
