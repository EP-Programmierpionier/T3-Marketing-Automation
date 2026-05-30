// Segmentierte Webinar-Einladung (Blueprint Section 3B): BW vs BY mit
// abweichender Foerderlandschaft, persona-uebergreifend (Brevo-Listensegment),
// Trigger-Reihenfolge Pflicht->Frist->Foerderhebel. Guardrail-geprueft:
// KEINE Knappheit ("nur noch X Plaetze") - 20 Plaetze sind echte Kapazitaet.

import type { InvitationCopy, LumaEvent, Segment } from "./types.ts";
import { assertClean } from "../texting/guardrails.ts";

// Foerderkulisse je Bundesland (bewusst allgemein gehalten, als Risikominderung).
const SEGMENT_FOERDER: Record<Segment, string> = {
  BW: "die Foerderkulisse in Baden-Wuerttemberg (u.a. KEA-BW-Angebote)",
  BY: "die bayerische Foerderkulisse",
};

const SEGMENT_ANSPRACHE: Record<Segment, string> = {
  BW: "fuer Kommunen in Baden-Wuerttemberg",
  BY: "fuer Kommunen in Bayern",
};

/** Baut eine LUMA-URL mit UTM-Parametern (nur utm_* + ref werden getrackt). */
export function buildUtmUrl(baseUrl: string, eventId: string, segment: Segment): string {
  const u = new URL(baseUrl);
  u.searchParams.set("utm_source", "brevo");
  u.searchParams.set("utm_medium", "email");
  u.searchParams.set("utm_campaign", `webinar_${eventId}`);
  u.searchParams.set("utm_content", segment.toLowerCase());
  return u.toString();
}

export function buildInvitation(event: LumaEvent, segment: Segment): InvitationCopy {
  const cta_url = buildUtmUrl(event.url, event.id, segment);
  const datum = event.start_at.slice(0, 10);
  const kapazitaet = event.capacity ?? 20;

  const subject = `Webinar ${SEGMENT_ANSPRACHE[segment]}: ${event.name}`;

  const body = [
    `Sehr geehrte Damen und Herren,`,
    ``,
    `als Pflichtaufgabe mit klaren Fristen ruecken kommunale Energie- und`,
    `Sanierungsthemen weiter nach oben. Im Webinar "${event.name}" (${datum})`,
    `ordnen wir ein, was jetzt ansteht - und wie Sie ${SEGMENT_FOERDER[segment]}`,
    `nutzen, um den Eigenanteil zu senken und ohne neuen Stellenbedarf`,
    `handlungsfaehig zu bleiben.`,
    ``,
    `Sie nehmen konkrete Ergebnisse mit: eine gremienfaehige Einordnung und`,
    `naechste Schritte fuer Ihre Kommune.`,
    ``,
    `Das Webinar ist auf ${kapazitaet} Teilnehmende ausgelegt, damit wir`,
    `individuell auf Ihre Fragen eingehen koennen.`,
    ``,
    `Jetzt anmelden: ${cta_url}`,
    ``,
    `Mit besten Gruessen`,
    `Ihr Team der Effizienzpioniere`,
  ].join("\n");

  assertClean(subject, `invite-subject(${event.id}/${segment})`);
  assertClean(body, `invite-body(${event.id}/${segment})`);
  return { segment, subject, body, cta_url };
}
