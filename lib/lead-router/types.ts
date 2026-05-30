// Typen fuer den Lead-Router (Blueprint Section 3A).

import type { Bundesland, Persona, StageKey } from "../types.ts";

export type LeadSource = "usebasin" | "luma";

/** Kanonischer, normalisierter Lead (quelle-unabhaengig). */
export interface RawLead {
  source: LeadSource;
  email: string;
  name: string;
  funktion?: string;
  kommune: string;
  anrede?: string;
  nachricht?: string;
  webinar?: { event_id?: string; name?: string; date?: string };
}

/** Markiert einen als Spam erkannten Eingang (Honeypot). */
export interface SpamLead {
  spam: true;
  reason: string;
}

export type NormalizeResult = RawLead | SpamLead;

export function isSpam(r: NormalizeResult): r is SpamLead {
  return (r as SpamLead).spam === true;
}

/** Routing-Entscheidung inkl. Spine-Anreicherung. */
export interface RoutedLead {
  lead: RawLead;
  contact_uid: string;
  persona: Persona;
  bundesland?: Bundesland;
  einwohner?: number;
  icp_fit: number;
  archetype: "BW" | "BY" | "unknown";
  owner: string;
  enters_call_cockpit: boolean;
  target_stage: StageKey;
  needs_review: boolean;
  notes: string[];
}
