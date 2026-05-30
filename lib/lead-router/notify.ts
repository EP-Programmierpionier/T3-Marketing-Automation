// Sales-Benachrichtigung fuer einen gerouteten Lead (Blueprint Section 3A):
// warmer Kontext statt Roh-Formular. Section 11-konformer Aufhaenger inklusive.

import type { RoutedLead } from "./types.ts";
import { stageMap } from "../config.ts";
import { generateOpenerFor } from "../texting/opener.ts";
import { assertClean } from "../texting/guardrails.ts";

/** Kurzer, guardrail-konformer Benachrichtigungstext (Teams/Mail). */
export function buildLeadNotification(routed: RoutedLead): string {
  const { lead } = routed;
  const sm = stageMap();
  const stageDef = sm.get(routed.target_stage);
  const queue = stageDef?.queue ?? "reachout";
  const opener = generateOpenerFor({ kommune: lead.kommune, persona: routed.persona }, queue);

  const quelle = lead.source === "luma" ? "Webinar-Anmeldung (LUMA)" : "Kontaktformular (Website)";
  const geo = routed.bundesland ?? "?";
  const ew = routed.einwohner !== undefined ? `${routed.einwohner.toLocaleString("de-DE")} EW` : "EW unbekannt";

  const lines = [
    `Neuer Lead (${quelle}) -> ${routed.owner}${routed.needs_review ? " [GEO PRUEFEN]" : ""}`,
    `Kommune: ${lead.kommune} (${geo}, ${ew}) | Kontakt: ${lead.name}${lead.funktion ? ` (${lead.funktion})` : ""}`,
    `Persona: ${routed.persona} | ICP-Fit ${routed.icp_fit.toFixed(2)} | Archetyp ${routed.archetype}`,
    `Ziel-Stage: ${stageDef?.label ?? routed.target_stage}${routed.enters_call_cockpit ? " | im Call-Cockpit" : " | kein Call (BW/Review)"}`,
    `Aufhaenger: ${opener}`,
  ];
  if (lead.nachricht) lines.push(`Nachricht: "${lead.nachricht}"`);
  if (lead.webinar?.name) {
    lines.push(`Webinar: ${lead.webinar.name}${lead.webinar.date ? ` (${lead.webinar.date})` : ""}`);
  }
  for (const n of routed.notes) lines.push(`Hinweis: ${n}`);

  const text = lines.join("\n");
  assertClean(text, `lead-notification(${routed.contact_uid.slice(0, 8)})`);
  return text;
}
