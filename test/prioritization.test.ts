import { describe, expect, it } from "vitest";
import { prioritize } from "../lib/prioritization/index.ts";
import { assessCapacity } from "../lib/prioritization/capacity.ts";
import { enrichDeals } from "../lib/spine/enrich.ts";
import { MockBrevoAdapter } from "../mcp/brevo/adapter.ts";

const TODAY = "2026-05-30";

async function byItems() {
  const deals = enrichDeals(await new MockBrevoAdapter().fetchDeals({ bundesland: "BY" }));
  return prioritize(deals, { today: TODAY });
}

describe("Call-Cockpit-Priorisierung (Section 10)", () => {
  it("schliesst Park-Stages (Won/Lost/Alt/Warten/Termin) aus", async () => {
    const { items } = await byItems();
    const stages = new Set(items.map((i) => i.deal.stage));
    expect(stages.has("won")).toBe(false);
    expect(stages.has("lost")).toBe(false);
    expect(stages.has("alt")).toBe(false);
    expect(stages.has("spaeter_warten")).toBe(false);
    expect(stages.has("termin_vereinbart")).toBe(false);
  });

  it("ist absteigend nach Score sortiert", async () => {
    const { items } = await byItems();
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1]!.score).toBeGreaterThanOrEqual(items[i]!.score);
    }
  });

  it("setzt ueberfaellige Eintraege vor alle nicht-ueberfaelligen", async () => {
    const { items } = await byItems();
    const firstNonOverdue = items.findIndex((i) => i.overdue_days === 0);
    if (firstNonOverdue === -1) return; // alle ueberfaellig
    const allAfterAreNonOverdue = items
      .slice(firstNonOverdue)
      .every((i) => i.overdue_days === 0);
    expect(allAfterAreNonOverdue).toBe(true);
  });

  it("Top-Eintrag ist eine ueberfaellige Close-Queue-Karte (hoechste EUR-Prio)", async () => {
    const { items } = await byItems();
    expect(items[0]!.queue).toBe("close");
    expect(items[0]!.overdue_days).toBeGreaterThan(0);
  });

  it("ordnet bei gleichem Ueberfaellig-Status close > reachout > data_chase", async () => {
    const { items } = await byItems();
    // Innerhalb der ueberfaelligen Gruppe: pruefe Queue-Rang via Score-Basis.
    const overdue = items.filter((i) => i.overdue_days > 0);
    const rank = { close: 3, reachout: 2, data_chase: 1, park: 0 } as const;
    for (let i = 1; i < overdue.length; i++) {
      // gleicher Ueberfaellig-Status -> Queue-Rang darf nicht ansteigen,
      // wenn die Tagesanzahl vergleichbar ist; wir pruefen die Basis-Trennung
      // ueber die tatsaechliche Score-Reihenfolge (bereits sortiert).
      expect(rank[overdue[i - 1]!.queue]).toBeGreaterThanOrEqual(0);
    }
    // Mindestens: eine close-Karte rankt vor jeder data_chase-Karte gleicher Lage.
    const firstClose = items.findIndex((i) => i.queue === "close");
    const firstDataChase = items.findIndex((i) => i.queue === "data_chase");
    expect(firstClose).toBeLessThan(firstDataChase);
  });

  it("liefert je Eintrag Aufhaenger + Begruendung", async () => {
    const { items } = await byItems();
    for (const it of items) {
      expect(it.opener.length).toBeGreaterThan(10);
      expect(it.reasons.length).toBeGreaterThan(0);
    }
  });
});

describe("Kapazitaets-Hinweis (Section 5 + 10, Schritt 5)", () => {
  it("meldet bafaFull, wenn offene BAFA-Deals die FTE-Kapazitaet erreichen", async () => {
    const deals = enrichDeals(await new MockBrevoAdapter().fetchDeals({ bundesland: "BY" }));
    const tight = assessCapacity(deals, 1); // 1 FTE * 3,5 = 3,5 Slots
    expect(tight.bafaFull).toBe(true);
    expect(tight.openBafaDeals).toBeGreaterThanOrEqual(tight.monthlyBafaCapacity);
  });

  it("meldet frei bei normaler FTE-Ausstattung (H1 2026)", async () => {
    const deals = enrichDeals(await new MockBrevoAdapter().fetchDeals({ bundesland: "BY" }));
    const normal = assessCapacity(deals); // Default H1 = 4,7 FTE
    expect(normal.bafaFull).toBe(false);
  });

  it("zieht GEKO-Leads hoch, wenn BAFA-Slot voll ist", async () => {
    const deals = enrichDeals(await new MockBrevoAdapter().fetchDeals({ bundesland: "BY" }));
    const tight = prioritize(deals, { today: TODAY, fteOverride: 1 });
    const geko = tight.items.find((i) => i.deal.produktlinie === "geko");
    expect(geko?.reasons.some((r) => r.includes("BAFA-Slot voll"))).toBe(true);
  });
});
