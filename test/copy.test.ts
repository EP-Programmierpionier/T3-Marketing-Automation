import { describe, expect, it } from "vitest";
import { buildNewsletterVariants } from "../lib/copy/newsletter.ts";
import { deriveHypotheses } from "../lib/copy/hypotheses.ts";
import { getThemenConfig } from "../lib/config.ts";
import { lint } from "../lib/texting/guardrails.ts";
import { buildPacing } from "../agents/conversion-analyst/run.ts";
import { buildCopyRun } from "../agents/campaign-copywriter/run.ts";

const TODAY = "2026-05-30";

describe("Newsletter-Varianten", () => {
  it("erzeugt A/B (pflicht_first + foerder_first) je Persona", () => {
    const thema = getThemenConfig().themen[0]!;
    const variants = buildNewsletterVariants(thema, "kaemmerei");
    expect(variants).toHaveLength(2);
    expect(variants.map((v) => v.strategy)).toEqual(["pflicht_first", "foerder_first"]);
    expect(variants[0]!.cta_url).toContain("utm_campaign=newsletter_");
  });

  it("alle Varianten sind guardrail-konform (kein FOMO/ROI/sparen)", () => {
    for (const thema of getThemenConfig().themen) {
      for (const persona of thema.personas) {
        for (const v of buildNewsletterVariants(thema, persona)) {
          expect(lint(v.subject), v.variant_id).toHaveLength(0);
          expect(lint(v.body), v.variant_id).toHaveLength(0);
        }
      }
    }
  });

  it("Bauamt-Copy nutzt Substanzerhalt statt Klima-only", () => {
    const thema = getThemenConfig().themen.find((t) => t.personas.includes("bauamt"))!;
    const v = buildNewsletterVariants(thema, "bauamt")[0]!;
    expect(v.body.toLowerCase()).toContain("substanzerhalt");
  });
});

describe("deriveHypotheses (Closed Loop)", () => {
  it("leitet Hypothesen aus den Pacing-Signalen ab", async () => {
    const pacing = await buildPacing(TODAY);
    const hyps = deriveHypotheses(pacing);
    expect(hyps.length).toBeGreaterThan(0);
    // Daten-Stau ist in der Mock-Pipeline vorhanden -> H-daten-chase erwartet.
    expect(hyps.some((h) => h.id === "H-daten-chase")).toBe(true);
    for (const h of hyps) {
      expect(h.leading_metric.length).toBeGreaterThan(0);
      expect(h.experiment.length).toBeGreaterThan(0);
    }
  });
});

describe("buildCopyRun (Integration)", () => {
  it("liefert Hypothesen + Varianten", async () => {
    const run = await buildCopyRun(TODAY);
    expect(run.hypotheses.length).toBeGreaterThan(0);
    expect(run.variants.length).toBeGreaterThan(0);
    // Variantenanzahl = 2 * Summe(Personas je Thema)
    const expected =
      getThemenConfig().themen.reduce((s, t) => s + t.personas.length, 0) * 2;
    expect(run.variants.length).toBe(expected);
  });
});
