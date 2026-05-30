// Post-Webinar-Follow-up (Blueprint Section 3B/8.3): Teilnehmer-/No-Show-Liste
// -> Archetyp-Weiche (Lead-Router) -> Brevo-Stage/Task + Follow-up-Mail in zwei
// Varianten. Attendee: Vertiefung + Termin-Link; No-Show: Aufzeichnung + naechster
// Termin. Alles guardrail-geprueft.

import type { FollowupPlan, LumaEvent, LumaRegistration } from "./types.ts";
import type { RawLead } from "../lead-router/types.ts";
import { routeLead } from "../lead-router/route.ts";
import { assertClean } from "../texting/guardrails.ts";

// Outlook-Bookings "Expertengespraech" (Projekt-Brief Section 2).
const BOOKING_URL =
  "https://outlook.office.com/book/BuchungDanielSchfers@effizienzpioniere.de/s/tLEvRsaxNEqePM70_IbX5A2";

function toLead(reg: LumaRegistration, event: LumaEvent): RawLead {
  return {
    source: "luma",
    email: reg.email,
    name: reg.name || reg.email,
    funktion: reg.answers.funktion,
    anrede: reg.answers.anrede,
    kommune: reg.answers.kommune ?? "Unbekannt",
    webinar: { event_id: event.id, name: event.name, date: event.start_at.slice(0, 10) },
  };
}

function attendedMail(event: LumaEvent): { subject: string; body: string } {
  const subject = `Danke fuer Ihre Teilnahme: ${event.name}`;
  const body = [
    `vielen Dank fuer Ihre Teilnahme am Webinar "${event.name}".`,
    ``,
    `Wenn Sie die naechsten Schritte fuer Ihre Kommune konkretisieren moechten,`,
    `lassen Sie uns das in einem kostenfreien Expertengespraech (30 Min) tun -`,
    `mit Blick auf Pflichten, Fristen und passende Foerderung (Eigenanteil senken).`,
    ``,
    `Termin direkt buchen: ${BOOKING_URL}`,
  ].join("\n");
  return { subject, body };
}

function noShowMail(event: LumaEvent): { subject: string; body: string } {
  const subject = `Verpasst? Aufzeichnung + naechster Termin: ${event.name}`;
  const body = [
    `schade, dass es beim Webinar "${event.name}" nicht geklappt hat.`,
    ``,
    `Gerne senden wir Ihnen die Aufzeichnung und einen Hinweis auf den naechsten`,
    `Termin. Falls es schneller gehen soll: ein kostenfreies Expertengespraech`,
    `(30 Min) ordnet Pflichten, Fristen und Foerdermoeglichkeiten fuer Ihre`,
    `Kommune ein.`,
    ``,
    `Termin direkt buchen: ${BOOKING_URL}`,
  ].join("\n");
  return { subject, body };
}

/** Erstellt den Follow-up-Plan fuer alle Registrierungen eines Events. */
export function planFollowups(event: LumaEvent, registrations: LumaRegistration[]): FollowupPlan[] {
  return registrations.map((reg) => {
    const routed = routeLead(toLead(reg, event));
    const status = reg.checked_in ? "attended" : "no_show";
    const mail = status === "attended" ? attendedMail(event) : noShowMail(event);
    // Halbwarmer Call nur fuer Teilnehmer im Proaktiv-Call-Archetyp (BY/Daniel).
    const create_call_task = status === "attended" && routed.archetype === "BY";

    const notes = [...routed.notes];
    if (status === "attended" && routed.archetype === "BW") {
      notes.push("BW: warmer Inbound -> direkte Buchung/Nurture, kein Call-Task.");
    }

    assertClean(mail.subject, `followup-subject(${event.id}/${status})`);
    assertClean(mail.body, `followup-body(${event.id}/${status})`);

    return {
      contact_uid: routed.contact_uid,
      email: reg.email,
      name: reg.name || reg.email,
      kommune: routed.lead.kommune,
      persona: routed.persona,
      bundesland: routed.bundesland,
      archetype: routed.archetype,
      owner: routed.owner,
      status,
      enters_call_cockpit: routed.enters_call_cockpit && status === "attended",
      create_call_task,
      target_stage: "neu_webinar",
      mail_subject: mail.subject,
      mail_body: mail.body,
      notes,
    };
  });
}
