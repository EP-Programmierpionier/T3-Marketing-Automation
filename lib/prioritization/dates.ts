// Kleine, testbare Datums-Helfer. Alle Daten als ISO YYYY-MM-DD.

/** Tagesdifferenz a - b in ganzen Tagen (UTC, kalendarisch). */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z");
  return Math.round(ms / 86_400_000);
}

/** Wie viele Tage liegt `date` vor `today` (>=0). 0, wenn date >= today. */
export function daysOverdue(dueDate: string | undefined, today: string): number {
  if (!dueDate) return 0;
  return Math.max(0, daysBetween(today, dueDate));
}

/** Tage seit `date` bis `today` (>=0). 0, wenn unbekannt. */
export function daysSince(date: string | undefined, today: string): number {
  if (!date) return 0;
  return Math.max(0, daysBetween(today, date));
}

/** Heutiges Datum als ISO YYYY-MM-DD (UTC). */
export function todayIso(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}
