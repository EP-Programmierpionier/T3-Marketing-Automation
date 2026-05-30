// Typen fuer den Webinar-Orchestrator (Blueprint Section 3B + 8.3).

import type { Bundesland, Persona, StageKey } from "../types.ts";

/** LUMA-Event (Teilmenge der Felder, Projekt-Brief Section 8). */
export interface LumaEvent {
  id: string;
  name: string;
  start_at: string; // ISO
  end_at?: string;
  url: string; // luma.com/<slug>
  cover_url?: string;
  tags: string[]; // z.B. ["Kommunen","Förderung","Klima"]
  capacity?: number; // echte Kapazitaet (i.d.R. 20)
}

/** Eine LUMA-Registrierung inkl. Check-in-Status (attended/no_show). */
export interface LumaRegistration {
  email: string;
  name: string;
  answers: { anrede?: string; kommune?: string; funktion?: string };
  checked_in: boolean;
}

export type Segment = Bundesland; // Einladungs-Segmentierung BW vs BY

/** Generierte Einladungs-Copy fuer ein Segment. */
export interface InvitationCopy {
  segment: Segment;
  subject: string;
  body: string;
  cta_url: string; // LUMA-Link inkl. UTM
}

export type AttendanceStatus = "attended" | "no_show";

/** Post-Webinar-Follow-up-Plan je Teilnehmer. */
export interface FollowupPlan {
  contact_uid: string;
  email: string;
  name: string;
  kommune: string;
  persona: Persona;
  bundesland?: Bundesland;
  archetype: "BW" | "BY" | "unknown";
  owner: string;
  status: AttendanceStatus;
  enters_call_cockpit: boolean;
  create_call_task: boolean; // halbwarmer Call (nur attended + BY)
  target_stage: StageKey;
  mail_subject: string;
  mail_body: string;
  notes: string[];
}
