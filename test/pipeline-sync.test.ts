import { describe, expect, it } from "vitest";
import { reconcile } from "../lib/pipeline-sync/reconcile.ts";
import { enrichDeals } from "../lib/spine/enrich.ts";
import { MockBrevoAdapter } from "../mcp/brevo/adapter.ts";
import { MockExplorerAdapter } from "../mcp/projekt-explorer/adapter.ts";
import { buildReconciliation } from "../agents/pipeline-sync/run.ts";

async function setup() {
  const deals = enrichDeals(await new MockBrevoAdapter().fetchDeals());
  const angebote = await new MockExplorerAdapter().listAngebote();
  return reconcile(angebote, deals);
}

describe("Pipeline-Sync Reconcile", () => {
  it("schlaegt 'advance_to_won' vor, wenn Explorer angenommen meldet", async () => {
    const d = await setup();
    const adv = d.find((x) => x.kind === "advance_to_won" && x.deal_id === "D-1001");
    expect(adv).toBeTruthy();
  });

  it("erkennt Betrags-Abweichung (D-1002: 7445 vs 8000)", async () => {
    const d = await setup();
    expect(d.some((x) => x.kind === "amount_mismatch" && x.deal_id === "D-1002")).toBe(true);
  });

  it("meldet Explorer-Eintrag ohne Brevo-Deal (D-8888)", async () => {
    const d = await setup();
    expect(d.some((x) => x.kind === "missing_in_brevo" && x.deal_id === "D-8888")).toBe(true);
  });

  it("meldet Brevo-Money-Stage ohne Explorer-Eintrag (z.B. D-1003)", async () => {
    const d = await setup();
    expect(d.some((x) => x.kind === "missing_in_explorer" && x.deal_id === "D-1003")).toBe(true);
  });

  it("matchender Betrag (D-1004) erzeugt keinen amount_mismatch", async () => {
    const d = await setup();
    expect(d.some((x) => x.kind === "amount_mismatch" && x.deal_id === "D-1004")).toBe(false);
  });
});

describe("buildReconciliation", () => {
  it("liefert eine Diskrepanzliste", async () => {
    const d = await buildReconciliation();
    expect(Array.isArray(d)).toBe(true);
    expect(d.length).toBeGreaterThan(0);
  });
});
