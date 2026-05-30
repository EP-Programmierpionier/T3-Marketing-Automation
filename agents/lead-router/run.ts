// Lead-Router-Agent (Roadmap-Schritt 3, Blueprint Section 3A).
// usebasin/LUMA-Payload -> normalisieren -> routen (Archetyp-Weiche) ->
// Brevo-Contact/Deal (Sink) -> Sales-Benachrichtigung.
//
// Aufruf: npm run lead-router            (nutzt test/sample-leads.json)
//         npm run lead-router -- --fixture=pfad.json

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { isSpam, type NormalizeResult } from "../../lib/lead-router/types.ts";
import { normalizeLuma, normalizeUsebasin } from "../../lib/lead-router/normalize.ts";
import { routeLead } from "../../lib/lead-router/route.ts";
import { buildLeadNotification } from "../../lib/lead-router/notify.ts";
import { getLeadSink, type LeadSink } from "../../mcp/brevo/sink.ts";

export interface LeadEnvelope {
  source: "usebasin" | "luma";
  payload: Record<string, unknown>;
}

export interface ProcessedLead {
  ok: boolean;
  notification?: string;
  contact_id?: string;
  deal_id?: string;
  rejected_reason?: string;
}

function normalize(env: LeadEnvelope): NormalizeResult {
  return env.source === "luma" ? normalizeLuma(env.payload) : normalizeUsebasin(env.payload);
}

/** Verarbeitet einen einzelnen Lead-Eingang. */
export async function processLead(env: LeadEnvelope, sink: LeadSink): Promise<ProcessedLead> {
  const norm = normalize(env);
  if (isSpam(norm)) {
    return { ok: false, rejected_reason: norm.reason };
  }
  const routed = routeLead(norm);
  const result = await sink.upsert(routed);
  return {
    ok: true,
    notification: buildLeadNotification(routed),
    contact_id: result.contact_id,
    deal_id: result.deal_id,
  };
}

export async function processLeads(
  envelopes: LeadEnvelope[],
  sink: LeadSink = getLeadSink(),
): Promise<ProcessedLead[]> {
  const out: ProcessedLead[] = [];
  for (const env of envelopes) out.push(await processLead(env, sink));
  return out;
}

function parseArgs(argv: string[]): { fixture: string } {
  const here = dirname(fileURLToPath(import.meta.url));
  let fixture = join(here, "..", "..", "test", "sample-leads.json");
  for (const a of argv) {
    const m = a.match(/^--fixture=(.+)$/);
    if (m && m[1]) fixture = m[1];
  }
  return { fixture };
}

async function main(): Promise<void> {
  const { fixture } = parseArgs(process.argv.slice(2));
  const envelopes = JSON.parse(readFileSync(fixture, "utf8")) as LeadEnvelope[];
  const sink = getLeadSink();
  const results = await processLeads(envelopes, sink);

  let routedCount = 0;
  let spamCount = 0;
  for (const r of results) {
    if (!r.ok) {
      spamCount++;
      console.log(`ABGEWIESEN: ${r.rejected_reason}\n`);
      continue;
    }
    routedCount++;
    console.log(r.notification);
    console.log(`-> Brevo: contact ${r.contact_id}, deal ${r.deal_id}\n`);
  }
  console.log("----------------------------------------");
  console.log(`Verarbeitet: ${results.length} | geroutet: ${routedCount} | abgewiesen: ${spamCount}`);
  console.log(`Sink: ${sink.name}`);
}

const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main().catch((err) => {
    console.error("Lead-Router fehlgeschlagen:", err);
    process.exit(1);
  });
}
