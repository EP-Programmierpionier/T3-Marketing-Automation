// Typen fuer die KAM-Motion (Blueprint Section 8.2b).

import type { Bundesland, Persona, Produktlinie } from "../types.ts";

export type KamStageKey =
  | "bestandskunde"
  | "folgebedarf_erkannt"
  | "folgeangebot"
  | "folgeauftrag"
  | "kein_folgebedarf";

export type KamStageKind = "park" | "work" | "close" | "won" | "lost";

/** Ein begleiteter Bestandskunde (eigene KAM-Pipeline, getrennt von Neu-Logo). */
export interface KamAccount {
  id: string;
  kommune: string;
  bundesland: Bundesland;
  owner: string; // KAM-Rolle
  stage: KamStageKey;
  /** Historisches Auftragsvolumen (Basis fuer NRR), z.B. 2025. */
  base_revenue_eur: number;
  /** Wert des aktuellen Folgebedarfs/-angebots/-auftrags. */
  folge_revenue_eur: number;
  produktlinie?: Produktlinie;
  persona?: Persona;
  next_action?: string;
  due_date?: string;
  last_activity?: string;
}
