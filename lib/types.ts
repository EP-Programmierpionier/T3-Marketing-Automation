// Kanonische Domaenen-Typen fuer die Marketing-Automation.
// Quelle: Projekt-Brief Section 4 (Pipeline) + Section 8 (Datenfelder).

/** Bundesland-Archetyp (Section 3). v1 bedient BY. */
export type Bundesland = "BW" | "BY";

/** Kanonische Stage-Keys (siehe config/stages.yaml). */
export type StageKey =
  | "alt"
  | "neu_webinar"
  | "versucht_erreichen"
  | "im_gespraech"
  | "termin_vereinbart"
  | "spaeter_warten"
  | "daten_angefragt"
  | "daten_erhalten"
  | "angebot_versendet"
  | "won"
  | "lost";

/** Priorisierungs-Queue (Section 10). */
export type Queue = "close" | "reachout" | "data_chase" | "park";

/** Persona (Section 6). */
export type Persona =
  | "klima_energiemanager"
  | "bauamt"
  | "buergermeister"
  | "kaemmerei";

/** Produktlinie (Section 5). */
export type Produktlinie = "bafa" | "geko" | "geko_light" | "zusatz" | "neu";

/** Next-Action-Chip aus Brevo (Section 4). */
export type NextActionKind = "call" | "meeting" | "todo" | "email";

export interface Contact {
  name: string;
  funktion?: string; // Freitext, z.B. "Bauamtsleiter" -> Persona-Klassifikation
  email: string;
}

/**
 * Ein Brevo-Deal (Soll-Felder je Deal, Section 8).
 * Datums-Felder als ISO-String (YYYY-MM-DD), damit Fixtures stabil sind.
 */
export interface Deal {
  id: string;
  deal_url: string;
  kommune: string;
  bundesland: Bundesland;
  einwohner?: number; // fuer ICP-Fit (10k-50k ideal)
  owner: string;
  stage: StageKey;
  contact: Contact;
  persona?: Persona; // optional roh; wird sonst aus funktion abgeleitet
  revenue_eur: number;
  produktlinie?: Produktlinie;
  n_bafa?: number;
  n_geko?: number;
  n_geko_light?: number;
  next_action?: NextActionKind;
  due_date?: string; // ISO; < heute => ueberfaellig
  last_activity?: string; // ISO; letzte Aktivitaet
  webinar_date?: string; // ISO; fuer Reach-out-Aktualitaet
  consent_state?: "none" | "aggregate" | "identified";
}

/** Mit Spine angereicherter Deal (contact_uid, abgeleitete Persona, ICP-Fit). */
export interface EnrichedDeal extends Deal {
  contact_uid: string;
  persona: Persona;
  icp_fit: number; // 0..1
}

/** Ergebnis der Priorisierung pro Deal. */
export interface PrioritizedItem {
  deal: EnrichedDeal;
  queue: Queue;
  score: number;
  overdue_days: number; // 0 = nicht ueberfaellig
  days_since_activity: number;
  reasons: string[]; // menschenlesbare Begruendung
  opener: string; // Section 6/11-konformer Gespraechsaufhaenger
}
