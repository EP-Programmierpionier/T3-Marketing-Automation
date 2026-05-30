// Newsletter-Copy-Generator (Blueprint Section 3C) mit A/B-Varianten unter den
// texting-guardrails. Primaer-CTA = Outlook-Booking-Link (Direkt-Termin), NICHT
// als Webinar-Auffangpfad geframt. Trigger-Reihenfolge Pflicht->Frist->
// Konsequenz->Foerderhebel. Persona-segmentiert (Bauamt nicht klima-only).

import type { Persona } from "../types.ts";
import type { ThemaDef } from "../config.ts";
import type { CopyVariant, VariantStrategy } from "./types.ts";
import { appendUtm, BOOKING_URL } from "../links.ts";
import { assertClean } from "../texting/guardrails.ts";

interface PersonaFraming {
  anliegen: string;
  beweis: string;
}

// Persona-spezifische Sprache (Section 6). Bauamt: Substanzerhalt statt Klima.
const FRAMING: Record<Persona, PersonaFraming> = {
  klima_energiemanager: {
    anliegen: "Klimaneutralitaet und Foerderquote",
    beweis: "abgerufene Foerdermittel und eine gremienfaehige Vorlage",
  },
  bauamt: {
    anliegen: "Substanzerhalt und Sanierungspriorisierung Ihrer Liegenschaften",
    beweis: "eine beschlussreife Wirtschaftlichkeitsberechnung und Sanierungs-Roadmap",
  },
  buergermeister: {
    anliegen: "Pflicht-Fristen und politische Absicherung",
    beweis: "Peer-Kommunen als Referenz und eine presse-faehige Ausgangslage",
  },
  kaemmerei: {
    anliegen: "Eigenanteil und Foerdermitnahme",
    beweis: "konkrete Eigenanteils-Zahlen und Foerderquoten",
  },
};

function subjectFor(thema: ThemaDef, strategy: VariantStrategy): string {
  return strategy === "pflicht_first"
    ? `${thema.name}: Pflicht & Fristen - was Ihre Kommune jetzt vorbereiten sollte`
    : `${thema.name}: Foerderquote sichern, Eigenanteil senken`;
}

function bodyFor(thema: ThemaDef, persona: Persona, strategy: VariantStrategy, cta: string): string {
  const f = FRAMING[persona];
  // Reihenfolge der Bloecke variiert je Strategie; Inhalt bleibt guardrail-konform.
  const pflichtBlock = [
    `Thema: ${thema.pflicht}.`,
    `Fristen: ${thema.frist}. Bei Verzoegerung droht: ${thema.konsequenz}.`,
  ].join(" ");
  const foerderBlock = `Foerderhebel: ${thema.foerder} - so laesst sich der Eigenanteil senken (Pflichtaufgabe ohne neuen Stellenbedarf).`;

  const ordered = strategy === "pflicht_first" ? [pflichtBlock, foerderBlock] : [foerderBlock, pflichtBlock];

  return [
    `Sehr geehrte Damen und Herren,`,
    ``,
    `mit Blick auf ${f.anliegen} ordnen wir kurz ein, was bei "${thema.name}" ansteht.`,
    ``,
    ordered[0]!,
    ``,
    ordered[1]!,
    ``,
    `Im Ergebnis erhalten Sie ${f.beweis}.`,
    ``,
    `Lassen Sie uns das in einem kostenfreien Expertengespraech (30 Min) fuer Ihre`,
    `Kommune konkretisieren - Termin direkt buchen: ${cta}`,
    ``,
    `Mit besten Gruessen`,
    `Ihr Team der Effizienzpioniere`,
  ].join("\n");
}

/** Erzeugt die A/B-Varianten (Pflicht-zuerst vs Foerder-zuerst) je Persona. */
export function buildNewsletterVariants(thema: ThemaDef, persona: Persona): CopyVariant[] {
  const strategies: { strategy: VariantStrategy; suffix: string }[] = [
    { strategy: "pflicht_first", suffix: "A" },
    { strategy: "foerder_first", suffix: "B" },
  ];

  return strategies.map(({ strategy, suffix }) => {
    const variant_id = `newsletter_${thema.key}_${persona}_${suffix}`;
    const cta_url = appendUtm(BOOKING_URL, {
      source: "brevo",
      medium: "newsletter",
      campaign: `newsletter_${thema.key}`,
      content: `${persona}_${suffix.toLowerCase()}`,
    });
    const subject = subjectFor(thema, strategy);
    const body = bodyFor(thema, persona, strategy, cta_url);
    assertClean(subject, `newsletter-subject(${variant_id})`);
    assertClean(body, `newsletter-body(${variant_id})`);
    return { variant_id, strategy, persona, thema_key: thema.key, subject, body, cta_url };
  });
}
