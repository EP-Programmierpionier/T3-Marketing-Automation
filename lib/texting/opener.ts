// Generiert Section 6/11-konforme Gespraechsaufhaenger pro Persona + Stage.
// Trigger-Reihenfolge: Pflicht-Bindung -> Frist -> Konsequenz -> Foerderhebel
// -> Klima (Bonus). Bauamt bekommt KEINE Klima-only-Sprache (Regel 3).
// Jeder Output wird gegen die Guardrails geprueft (assertClean).

import type { EnrichedDeal, Persona, Queue } from "../types.ts";
import { assertClean } from "./guardrails.ts";

// Persona-spezifischer "Haken" (Pflicht/Frist-Bindung zuerst).
const PERSONA_HOOK: Record<Persona, string> = {
  klima_energiemanager:
    "mit Blick auf die kommunale Waermeplanung (KWP) und die EnEfG-Pflichten",
  bauamt:
    "mit Blick auf GEG/GModG und den Substanzerhalt Ihrer Liegenschaften",
  buergermeister:
    "wegen der anstehenden Pflicht-Fristen und dem politischen Handlungsdruck",
  kaemmerei:
    "mit Blick auf Foerderquote und Eigenanteil (Foerdermittel mitnehmen, kein neuer Stellenbedarf)",
};

// Persona-spezifische Beweis-/Nutzensprache (Foerderung als Risikominderung).
const PERSONA_PROOF: Record<Persona, string> = {
  klima_energiemanager:
    "konkret abgerufene Foerdermittel und eine gremienfaehige Vorlage",
  bauamt:
    "eine Sanierungspriorisierung und beschlussreife Wirtschaftlichkeitsberechnung",
  buergermeister:
    "Peer-Kommunen als Referenz und eine presse-faehige Ausgangslage",
  kaemmerei:
    "konkrete Eigenanteils-Zahlen und Foerdermitnahme",
};

function stageOpener(deal: EnrichedDeal, queue: Queue, hook: string, proof: string): string {
  const k = deal.kommune;
  switch (queue) {
    case "close":
      // Offenes Angebot nachtelefonieren - Bezug aufs konkrete Angebot.
      return (
        `${k}: Nachfass zum versendeten Angebot ${proof ? `(${proof})` : ""}. ` +
        `Offene Rueckfragen kurz aufloesen und den Entscheidungs-/Gremienweg klaeren ${hook}.`
      ).replace(/\s+/g, " ").trim();
    case "data_chase":
      // Excel-Ruecklauf freundlich anmahnen.
      return (
        `${k}: freundlicher Nachfass zur Datenabfrage (Excel Kunden-/Gebaeudeinfos). ` +
        `Hilfe beim Ausfuellen anbieten oder 15-Min-Slot zum gemeinsamen Durchgehen ${hook}.`
      ).replace(/\s+/g, " ").trim();
    case "reachout":
      // Halbwarmer Anruf nach Webinar -> Expertengespraech.
      return (
        `${k}: Anschluss ans Webinar-Thema ${hook}. ` +
        `Naechster Schritt: kostenfreies Expertengespraech (30 Min); im Ergebnis ${proof}.`
      ).replace(/\s+/g, " ").trim();
    default:
      return (
        `${k}: Kontakt halten ${hook}; bei Bedarf ${proof}.`
      ).replace(/\s+/g, " ").trim();
  }
}

/**
 * Baut den finalen Aufhaenger und garantiert Guardrail-Konformitaet.
 */
export function generateOpener(deal: EnrichedDeal, queue: Queue): string {
  const hook = PERSONA_HOOK[deal.persona];
  const proof = PERSONA_PROOF[deal.persona];
  const text = stageOpener(deal, queue, hook, proof);
  assertClean(text, `opener(${deal.id}/${deal.persona}/${queue})`);
  return text;
}
