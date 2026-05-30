// Routing: RawLead -> RoutedLead (Spine-Anreicherung + Archetyp-Weiche).
// Quelle: Blueprint Section 3A + Brief Section 3 (zwei Archetypen).

import type { RawLead, RoutedLead } from "./types.ts";
import type { StageKey } from "../types.ts";
import { classifyPersona, icpFit } from "../spine/enrich.ts";
import { contactUid } from "../spine/contact-uid.ts";
import { resolveGemeinde } from "../spine/gemeinde.ts";

// Owner je Archetyp (Brief Section 2): BY -> Daniel (Proaktiv-Call),
// BW -> Jonas (Webinar-Inbound).
const OWNER_BY = "Daniel Schaefers";
const OWNER_BW = "Jonas Hofheinz";

/**
 * Ziel-Stage beim Anlegen/Heben des Deals:
 * - LUMA-Registrierung => "Neu / Webinarteilnahme" (Webinar-Zufluss)
 * - usebasin-Kontaktanfrage => "Im Gespräch / Mailkontakt" (aktiver Inbound)
 */
function targetStage(lead: RawLead): StageKey {
  return lead.source === "luma" ? "neu_webinar" : "im_gespraech";
}

export function routeLead(lead: RawLead): RoutedLead {
  const persona = classifyPersona(lead.funktion);
  const geo = resolveGemeinde(lead.kommune);
  const einwohner = geo?.einwohner;
  const bundesland = geo?.bundesland;
  const notes: string[] = [];

  let archetype: RoutedLead["archetype"];
  let owner: string;
  let enters_call_cockpit: boolean;
  let needs_review = false;

  if (bundesland === "BY") {
    archetype = "BY";
    owner = OWNER_BY;
    enters_call_cockpit = true; // Proaktiv-Call-Kaskade (Cockpit)
  } else if (bundesland === "BW") {
    archetype = "BW";
    owner = OWNER_BW;
    enters_call_cockpit = false; // Webinar-Inbound, Anrufebene uebersprungen
    notes.push("BW-Inbound: keine Anrufliste, Buchung/Nurture-Pfad (Jonas).");
  } else {
    archetype = "unknown";
    owner = OWNER_BY; // vorlaeufig Daniel, bis Geo geklaert
    enters_call_cockpit = false;
    needs_review = true;
    notes.push(`Kommune "${lead.kommune}" nicht im Gemeinde-Lookup -> Geo manuell pruefen.`);
  }

  if (geo && einwohner !== undefined && (einwohner < 10000 || einwohner > 50000)) {
    notes.push(`Einwohner ${einwohner} ausserhalb ICP-Band (10k-50k).`);
  }

  return {
    lead,
    contact_uid: contactUid(lead.email),
    persona,
    bundesland,
    einwohner,
    icp_fit: icpFit(einwohner, persona),
    archetype,
    owner,
    enters_call_cockpit,
    target_stage: targetStage(lead),
    needs_review,
    notes,
  };
}
