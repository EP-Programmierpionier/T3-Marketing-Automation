// Closed-Loop (Blueprint Section 3F): leitet testbare Copy-Hypothesen aus den
// Pacing-Signalen des Conversion-Analysten ab. Jede Hypothese benennt ein
// Leading-Signal als schnelle Messgroesse (Lagging hat 6-12 Wochen Latenz).

import type { PacingReport } from "../pacing/analyze.ts";
import type { Hypothesis } from "./types.ts";

export function deriveHypotheses(report: PacingReport): Hypothesis[] {
  const out: Hypothesis[] = [];
  const has = (needle: string) =>
    report.signals.leading.some((s) => s.includes(needle)) ||
    report.signals.lagging.some((s) => s.includes(needle));

  if (has("Daten-Stau")) {
    out.push({
      id: "H-daten-chase",
      signal: "Daten angefragt ohne Ruecklauf (Stau Schritt 4->5)",
      hypothesis: "Ein konkreter, hilfsorientierter Reminder (Ausfuellhilfe + 15-Min-Slot) erhoeht den Excel-Ruecklauf.",
      experiment: "A/B Daten-Chase-Mail: A neutral vs B 'gemeinsam ausfuellen'.",
      leading_metric: "Ruecklaufquote 'Daten erhalten' / 'Daten angefragt' (7-Tage-Fenster).",
    });
  }

  if (has("Reach-out-Backlog")) {
    out.push({
      id: "H-webinar-subject",
      signal: "Grosser Reach-out-Backlog in 'Neu / Webinarteilnahme'",
      hypothesis: "Betreffzeile 'Pflicht & Frist zuerst' schlaegt 'Foerder zuerst' bei der Erstansprache.",
      experiment: "A/B Webinar-Einladung/Newsletter-Betreff (pflicht_first vs foerder_first).",
      leading_metric: "Webinar-CTA-Klick bzw. newsletter_intent-Rate je Variante.",
    });
  }

  if (report.pacing.attainment_pct < 60) {
    out.push({
      id: "H-direct-booking",
      signal: `Monats-Pacing unter Plan (${report.pacing.attainment_pct}%)`,
      hypothesis: "Ein prominenter Direkt-Termin-CTA (Outlook-Booking) erhoeht die Buchungen vs. nur Webinar-Pfad.",
      experiment: "A/B Newsletter-CTA-Platzierung: Termin-Link oben vs unten.",
      leading_metric: "meeting_booked / Outlook-Bookings-Eintraege je Variante.",
    });
  }

  if (has("Kapazitaets-Klippe")) {
    out.push({
      id: "H-geko-shift",
      signal: "BAFA-Slot voll (Kapazitaets-Klippe)",
      hypothesis: "GEKO/GEKO-light-fokussierte Copy verlagert Nachfrage auf freie Kapazitaet.",
      experiment: "Segment-Kampagne GEKO-light fuer kleinere Kommunen.",
      leading_metric: "Anteil GEKO-Leads an neuen Deals (4-Wochen-Fenster).",
    });
  }

  return out;
}
