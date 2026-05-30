// Geteilte Links + UTM-Helfer (Projekt-Brief Section 2/7).
// Nur utm_* + ref werden vom Tracking durchgelassen.

// Outlook-Bookings "Expertengespraech" (30 Min, kostenfrei) - primaerer CTA.
export const BOOKING_URL =
  "https://outlook.office.com/book/BuchungDanielSchfers@effizienzpioniere.de/s/tLEvRsaxNEqePM70_IbX5A2";

export interface Utm {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
}

/** Haengt UTM-Parameter an eine URL (idempotent ueberschreibend). */
export function appendUtm(baseUrl: string, utm: Utm): string {
  const u = new URL(baseUrl);
  if (utm.source) u.searchParams.set("utm_source", utm.source);
  if (utm.medium) u.searchParams.set("utm_medium", utm.medium);
  if (utm.campaign) u.searchParams.set("utm_campaign", utm.campaign);
  if (utm.content) u.searchParams.set("utm_content", utm.content);
  return u.toString();
}
