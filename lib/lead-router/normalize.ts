// Normalisiert eingehende usebasin- und LUMA-Payloads -> RawLead.
// Quelle der Felder: Projekt-Brief Section 8.

import type { NormalizeResult, RawLead } from "./types.ts";

function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return undefined;
}

/**
 * usebasin-Kontaktformular: name (req), funktion (opt), kommune (req),
 * email (req), nachricht (opt), _gotcha (Honeypot). Gefuelltes _gotcha => Spam.
 */
export function normalizeUsebasin(payload: Record<string, unknown>): NormalizeResult {
  const honeypot = str(payload["_gotcha"]);
  if (honeypot) return { spam: true, reason: "Honeypot _gotcha gefuellt" };

  const email = str(payload["email"]);
  const kommune = str(payload["kommune"]);
  const name = str(payload["name"]);
  if (!email || !kommune || !name) {
    return { spam: true, reason: "Pflichtfelder fehlen (name/email/kommune)" };
  }

  const lead: RawLead = {
    source: "usebasin",
    email,
    name,
    funktion: str(payload["funktion"]),
    kommune,
    nachricht: str(payload["nachricht"]),
  };
  return lead;
}

/**
 * LUMA-Registrierung: Registrant (name/email) + Antworten auf die drei
 * Registrierungsfragen (Anrede, Kommune, Funktion) + optionaler Event-Kontext.
 */
export function normalizeLuma(payload: Record<string, unknown>): NormalizeResult {
  const email = str(payload["email"]);
  const name = str(payload["name"]);
  const answers = (payload["answers"] as Record<string, unknown>) ?? {};
  const kommune = str(answers["kommune"]) ?? str(payload["kommune"]);
  if (!email || !kommune) {
    return { spam: true, reason: "Pflichtfelder fehlen (email/kommune)" };
  }

  const event = (payload["event"] as Record<string, unknown>) ?? {};
  const lead: RawLead = {
    source: "luma",
    email,
    name: name ?? email,
    funktion: str(answers["funktion"]),
    anrede: str(answers["anrede"]),
    kommune,
    webinar: {
      event_id: str(event["id"]),
      name: str(event["name"]),
      date: str(event["start_at"])?.slice(0, 10),
    },
  };
  return lead;
}
