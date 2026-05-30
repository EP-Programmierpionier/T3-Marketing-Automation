import { describe, expect, it } from "vitest";
import { analyzePacing } from "../lib/pacing/analyze.ts";
import { monthlySalesPlan, produktlinieMonthlyPlan, fteForMonth } from "../lib/pacing/plan.ts";
import { renderPacingMarkdown } from "../lib/pacing/report.ts";
import { enrichDeals } from "../lib/spine/enrich.ts";
import { MockBrevoAdapter } from "../mcp/brevo/adapter.ts";
import { buildPacing } from "../agents/conversion-analyst/run.ts";

const TODAY = "2026-05-30";

async function report() {
  const deals = enrichDeals(await new MockBrevoAdapter().fetchDeals());
  return analyzePacing(deals, TODAY);
}

describe("plan helpers", () => {
  it("interpoliert den Monatsplan linear (Jan..Dez)", () => {
    expect(monthlySalesPlan(1).plan_eur).toBe(71953);
    expect(monthlySalesPlan(12).plan_eur).toBe(119177);
    const mai = monthlySalesPlan(5).plan_eur;
    expect(mai).toBeGreaterThan(71953);
    expect(mai).toBeLessThan(119177);
  });
  it("Produktlinien-Monatsplan = Jahr/12", () => {
    expect(produktlinieMonthlyPlan("bafa")).toBe(Math.round(655147 / 12));
  });
  it("FTE folgt Halbjahr", () => {
    expect(fteForMonth(5)).toBe(4.7);
    expect(fteForMonth(9)).toBe(5.7);
  });
});

describe("analyzePacing", () => {
  it("aggregiert Pipeline + Won korrekt", async () => {
    const r = await report();
    const won = r.pipeline.find((s) => s.stage === "won")!;
    expect(won.count).toBe(r.won.count);
    expect(r.won.count).toBeGreaterThan(0);
    expect(r.pipeline_total_eur).toBeGreaterThan(0);
  });

  it("erkennt den Daten-Stau als Leading-Signal", async () => {
    const r = await report();
    expect(r.signals.leading.some((s) => s.includes("Daten-Stau"))).toBe(true);
  });

  it("liefert Funnel-Drift fuer alle 7 Soll-Stufen", async () => {
    const r = await report();
    expect(r.funnel_by).toHaveLength(7);
    expect(r.funnel_by[0]!.funnel_stage).toBe(1);
  });

  it("segmentiert nach Bundesland (BW + BY befuellt)", async () => {
    const r = await report();
    expect(r.segments.bundesland.BY.deals).toBeGreaterThan(0);
    expect(r.segments.bundesland.BW.deals).toBeGreaterThan(0);
  });

  it("rechnet Produktlinien-Ist (BAFA hat Ist-Umsatz)", async () => {
    const r = await report();
    const bafa = r.produktlinien.find((p) => p.key === "bafa")!;
    expect(bafa.ist_eur).toBeGreaterThan(0);
    expect(bafa.ist_stueck).toBeGreaterThan(0);
  });
});

describe("buildPacing + render", () => {
  it("rendert einen Markdown-Report mit Kernabschnitten", async () => {
    const r = await buildPacing(TODAY);
    const md = renderPacingMarkdown(r);
    expect(md).toContain("Pacing-Report");
    expect(md).toContain("Zwei Uhren");
    expect(md).toContain("Funnel-Soll vs Ist");
    expect(md).toContain("EUR je Produktlinie");
    expect(md).toContain("Kapazitaet");
  });
});
