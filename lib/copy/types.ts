// Typen fuer Campaign-Copywriter + Closed-Loop (Blueprint Section 3C/3F).

import type { Persona } from "../types.ts";

export type VariantStrategy = "pflicht_first" | "foerder_first";

export interface CopyVariant {
  variant_id: string; // z.B. "newsletter_kwp_kaemmerei_A"
  strategy: VariantStrategy;
  persona: Persona;
  thema_key: string;
  subject: string;
  body: string;
  cta_url: string; // Outlook-Booking-Link + UTM (Primaer-CTA)
}

/** Eine testbare Hypothese aus den Pacing-Signalen (Closed Loop). */
export interface Hypothesis {
  id: string;
  signal: string; // beobachtetes Ist-Signal
  hypothesis: string; // was wir vermuten
  experiment: string; // A/B-Idee
  leading_metric: string; // woran wir es schnell messen (Leading)
}
