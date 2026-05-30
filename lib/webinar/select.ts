// Event-Auswahl fuer Site/Einladung: Tag "Kommunen" + zukuenftig + Top-N
// (Projekt-Brief Section 8). Sortiert nach Startdatum aufsteigend.

import type { LumaEvent } from "./types.ts";

export interface SelectOptions {
  tag?: string;
  top?: number;
}

export function selectUpcomingEvents(
  events: LumaEvent[],
  today: string,
  opts: SelectOptions = {},
): LumaEvent[] {
  const tag = opts.tag ?? "Kommunen";
  const top = opts.top ?? 5;
  return events
    .filter((e) => e.tags.includes(tag))
    .filter((e) => e.start_at.slice(0, 10) >= today)
    .sort((a, b) => (a.start_at < b.start_at ? -1 : 1))
    .slice(0, top);
}

/** Vergangene Kommunen-Events (fuer Post-Webinar-Verarbeitung). */
export function selectPastEvents(events: LumaEvent[], today: string, opts: SelectOptions = {}): LumaEvent[] {
  const tag = opts.tag ?? "Kommunen";
  return events
    .filter((e) => e.tags.includes(tag))
    .filter((e) => e.start_at.slice(0, 10) < today)
    .sort((a, b) => (a.start_at > b.start_at ? -1 : 1));
}
