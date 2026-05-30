import { describe, expect, it } from "vitest";
import { lint, assertClean } from "../lib/texting/guardrails.ts";
import { generateOpener } from "../lib/texting/opener.ts";
import { enrichDeals } from "../lib/spine/enrich.ts";
import { MockBrevoAdapter } from "../mcp/brevo/adapter.ts";
import { stageMap } from "../lib/config.ts";

describe("texting-guardrails lint", () => {
  it("flaggt Kaemmerei-Anti-Vokabular (ROI/Amortisation/Sparen)", () => {
    expect(lint("Das rechnet sich durch den ROI in 3 Jahren.").length).toBeGreaterThan(0);
    expect(lint("Die Amortisation liegt bei 5 Jahren.").length).toBeGreaterThan(0);
    expect(lint("So koennen Sie viel Geld sparen.").length).toBeGreaterThan(0);
  });

  it("flaggt FOMO / Knappheits-Trick", () => {
    expect(lint("Nur noch 3 Plaetze frei!").length).toBeGreaterThan(0);
    expect(lint("Letzte Chance, jetzt anmelden.").length).toBeGreaterThan(0);
  });

  it("laesst sauberen Fachtext durch", () => {
    const ok =
      "Foerdermittel mitnehmen, Eigenanteil senken, Pflichtaufgabe ohne neuen Stellenbedarf.";
    expect(lint(ok)).toHaveLength(0);
    expect(() => assertClean(ok)).not.toThrow();
  });
});

describe("generierte Aufhaenger sind guardrail-konform", () => {
  it("jeder Opener fuer jeden Deal/Queue passiert den Lint", async () => {
    const deals = enrichDeals(await new MockBrevoAdapter().fetchDeals());
    const sm = stageMap();
    for (const d of deals) {
      const queue = sm.get(d.stage)?.queue ?? "park";
      if (queue === "park") continue;
      const opener = generateOpener(d, queue);
      expect(lint(opener), `Opener fuer ${d.id}: ${opener}`).toHaveLength(0);
    }
  });
});
