// Spine-Anreicherung: contact_uid, Persona (aus Funktions-Freitext),
// ICP-Fit (aus Einwohnerzahl + Persona). Quelle: Section 6/7/8.

import type { Deal, EnrichedDeal, Persona } from "../types.ts";
import { contactUid } from "./contact-uid.ts";

/**
 * Klassifiziert die Persona aus dem Funktions-Freitext (Section 6).
 * Bewusst regelbasiert + transparent (kein LLM noetig fuer die haeufigen Faelle);
 * spaeter kann das Skill `persona-classify` schwierige Faelle uebernehmen.
 */
export function classifyPersona(funktion?: string, fallback: Persona = "klima_energiemanager"): Persona {
  if (!funktion) return fallback;
  const f = funktion.toLowerCase();

  // Reihenfolge: spezifischer zuerst. Umlaute werden sowohl als ä/ö/ü als
  // auch als ae/oe/ue-Transliteration erkannt (Brevo-Daten enthalten beides).
  if (/(b(ue|[uü])rgermeister|rathaus.?chef|verwaltungschef)/.test(f)) return "buergermeister";
  if (/(k(ae|[aä])mmer|finanz|haushalt|kasse)/.test(f)) return "kaemmerei";
  if (/(bauamt|bau|hochbau|tiefbau|liegenschaft|geb(ae|[aä])udemanagement|architekt)/.test(f)) return "bauamt";
  if (/(klima|energie|umwelt|nachhaltig|co2|kwp)/.test(f)) return "klima_energiemanager";

  return fallback;
}

/**
 * ICP-Fit 0..1 (Section 6: Kommunen 10k-50k EW).
 * - Einwohner im Zielband => hoher Basiswert; ausserhalb degradiert.
 * - Persona-Gewicht: Klima/Energie (~60 %) und Bauamt (~30 %) sind die Treiber.
 */
export function icpFit(einwohner: number | undefined, persona: Persona): number {
  let sizeScore: number;
  if (einwohner === undefined) {
    sizeScore = 0.5; // unbekannt -> neutral
  } else if (einwohner >= 10000 && einwohner <= 50000) {
    sizeScore = 1.0;
  } else if (einwohner < 10000) {
    // kleiner als Zielband: linear bis 0 bei 0 EW (aber Boden 0.3)
    sizeScore = Math.max(0.3, einwohner / 10000);
  } else {
    // groesser als Zielband (Grossstadt-Cases nicht zuerst, Regel 4)
    sizeScore = Math.max(0.2, 1 - (einwohner - 50000) / 100000);
  }

  const personaWeight: Record<Persona, number> = {
    klima_energiemanager: 1.0,
    bauamt: 0.95,
    kaemmerei: 0.8,
    buergermeister: 0.7,
  };

  return Math.round(sizeScore * personaWeight[persona] * 100) / 100;
}

/** Reichert einen rohen Deal zum EnrichedDeal an. */
export function enrichDeal(deal: Deal): EnrichedDeal {
  const persona = deal.persona ?? classifyPersona(deal.contact.funktion);
  return {
    ...deal,
    persona,
    contact_uid: contactUid(deal.contact.email),
    icp_fit: icpFit(deal.einwohner, persona),
  };
}

export function enrichDeals(deals: Deal[]): EnrichedDeal[] {
  return deals.map(enrichDeal);
}
