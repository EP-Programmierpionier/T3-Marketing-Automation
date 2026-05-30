// Webinar-Orchestrator (Roadmap-Schritt 4, Blueprint Section 3B/8.3).
// 1) Sync: kommende Kommunen-Events (Tag + future + Top-5)
// 2) Pre: segmentierte Einladung (BW/BY) fuers naechste Event
// 3) Post: Teilnehmer-/No-Show-Follow-up fuers letzte vergangene Event
//
// Aufruf: npm run webinar  [-- --today=YYYY-MM-DD]

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getLumaSource } from "../../mcp/luma/adapter.ts";
import { selectPastEvents, selectUpcomingEvents } from "../../lib/webinar/select.ts";
import { buildInvitation } from "../../lib/webinar/invite.ts";
import { planFollowups } from "../../lib/webinar/followup.ts";
import type { FollowupPlan, InvitationCopy, LumaEvent } from "../../lib/webinar/types.ts";
import { todayIso } from "../../lib/prioritization/dates.ts";

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, "..", "..", "out");

export interface WebinarRun {
  today: string;
  upcoming: LumaEvent[];
  invitations: InvitationCopy[];
  pastEvent?: LumaEvent;
  followups: FollowupPlan[];
}

export async function buildWebinarRun(today: string): Promise<WebinarRun> {
  const luma = getLumaSource();
  const events = await luma.listEvents();

  const upcoming = selectUpcomingEvents(events, today);
  const invitations = upcoming[0]
    ? [buildInvitation(upcoming[0], "BW"), buildInvitation(upcoming[0], "BY")]
    : [];

  const past = selectPastEvents(events, today);
  const pastEvent = past[0];
  const followups = pastEvent ? planFollowups(pastEvent, await luma.listRegistrations(pastEvent.id)) : [];

  return { today, upcoming, invitations, pastEvent, followups };
}

function parseArgs(argv: string[]): { today: string } {
  let today = todayIso();
  for (const a of argv) {
    const m = a.match(/^--today=(\d{4}-\d{2}-\d{2})$/);
    if (m && m[1]) today = m[1];
  }
  return { today };
}

function render(run: WebinarRun): string {
  const L: string[] = [];
  L.push(`# Webinar-Orchestrator - ${run.today}`);
  L.push("");
  L.push(`## Kommende Kommunen-Events (Top ${run.upcoming.length})`);
  for (const e of run.upcoming) L.push(`- ${e.start_at.slice(0, 10)} | ${e.name} | ${e.url}`);
  L.push("");

  if (run.invitations.length > 0) {
    L.push(`## Einladungs-Entwuerfe (naechstes Event, segmentiert)`);
    for (const inv of run.invitations) {
      L.push(`### Segment ${inv.segment}`);
      L.push(`**Betreff:** ${inv.subject}`);
      L.push(`**CTA:** ${inv.cta_url}`);
      L.push("```");
      L.push(inv.body);
      L.push("```");
    }
    L.push("");
  }

  if (run.pastEvent) {
    const att = run.followups.filter((f) => f.status === "attended").length;
    const no = run.followups.filter((f) => f.status === "no_show").length;
    L.push(`## Post-Webinar: ${run.pastEvent.name} (${run.pastEvent.start_at.slice(0, 10)})`);
    L.push(`Teilnehmer: ${att} | No-Show: ${no}`);
    L.push("");
    for (const f of run.followups) {
      const task = f.create_call_task ? " | + halbwarmer Call-Task" : "";
      L.push(`- **${f.kommune}** (${f.name}) | ${f.status} | ${f.archetype}/${f.owner}${task}`);
      L.push(`  - Mail: "${f.mail_subject}"`);
      for (const n of f.notes) L.push(`  - Hinweis: ${n}`);
    }
  }
  L.push("");
  L.push(`---`);
  L.push(`_Webinar-Orchestrator (Phase 0, Mock-Daten). Quelle: Blueprint Section 3B/8.3._`);
  return L.join("\n");
}

async function main(): Promise<void> {
  const { today } = parseArgs(process.argv.slice(2));
  const run = await buildWebinarRun(today);
  const md = render(run);

  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, `webinar-${today}.md`);
  writeFileSync(path, md, "utf8");

  console.log(md);
  console.log("\n----------------------------------------");
  console.log(`Report geschrieben: ${path}`);
  console.log(`Quelle: ${getLumaSource().name} | Einladungen: ${run.invitations.length} | Follow-ups: ${run.followups.length}`);
}

const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main().catch((err) => {
    console.error("Webinar-Orchestrator fehlgeschlagen:", err);
    process.exit(1);
  });
}
