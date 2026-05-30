import { describe, expect, it } from "vitest";
import { kamMetrics } from "../lib/kam/metrics.ts";
import { kamWorklist } from "../lib/kam/worklist.ts";
import { MockKamAdapter } from "../mcp/brevo/kam.ts";
import { buildKam } from "../agents/kam-manager/run.ts";

const TODAY = "2026-05-30";

async function accounts() {
  return new MockKamAdapter().fetchAccounts();
}

describe("KAM-Metriken", () => {
  it("zaehlt Folgeauftraege + Quote", async () => {
    const m = kamMetrics(await accounts());
    expect(m.begleitete_kommunen).toBe(7);
    expect(m.mit_folgeauftrag).toBe(2); // Aichach + Leonberg
    expect(m.folgeauftrags_quote_pct).toBeCloseTo(28.6, 1);
  });

  it("rechnet NRR = (Basis + Expansion) / Basis", async () => {
    const m = kamMetrics(await accounts());
    // Basis = Summe base_revenue; Expansion = won folge (14900 + 9000)
    expect(m.expansion_eur).toBe(23900);
    expect(m.nrr_pct).toBeGreaterThan(100);
  });

  it("summiert offene Folge-Pipeline (Folgebedarf + Folgeangebot)", async () => {
    const m = kamMetrics(await accounts());
    // K-1002 (22000) + K-1003 (12000) + K-1004 (7000)
    expect(m.offene_folge_eur).toBe(41000);
  });
});

describe("KAM-Worklist", () => {
  it("schliesst Bestandskunde/Won/Lost aus, priorisiert ueberfaellig+Folgeangebot", async () => {
    const wl = kamWorklist(await accounts(), TODAY);
    const stages = wl.map((w) => w.account.stage);
    expect(stages).not.toContain("bestandskunde");
    expect(stages).not.toContain("folgeauftrag");
    expect(stages).not.toContain("kein_folgebedarf");
    // Top: ueberfaelliges Folgeangebot (Bietigheim, due 2026-05-20) oder
    // ueberfaelliger Folgebedarf (Schwabach, due 2026-04-10). Schwabach ist
    // laenger ueberfaellig -> hoeherer overdue-Anteil, aber close-Basis hoeher.
    expect(wl[0]!.overdue_days).toBeGreaterThan(0);
  });
});

describe("buildKam", () => {
  it("liefert Metrics + Worklist", async () => {
    const v = await buildKam(TODAY);
    expect(v.metrics.begleitete_kommunen).toBe(7);
    expect(v.worklist.length).toBeGreaterThan(0);
  });
});
