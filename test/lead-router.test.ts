import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeLuma, normalizeUsebasin } from "../lib/lead-router/normalize.ts";
import { routeLead } from "../lib/lead-router/route.ts";
import { buildLeadNotification } from "../lib/lead-router/notify.ts";
import { isSpam, type RawLead } from "../lib/lead-router/types.ts";
import { lint } from "../lib/texting/guardrails.ts";
import { MockLeadSink } from "../mcp/brevo/sink.ts";
import { processLeads, type LeadEnvelope } from "../agents/lead-router/run.ts";

describe("normalize usebasin", () => {
  it("erkennt Honeypot als Spam", () => {
    const r = normalizeUsebasin({ name: "B", kommune: "X", email: "b@x.de", _gotcha: "x" });
    expect(isSpam(r)).toBe(true);
  });
  it("weist fehlende Pflichtfelder ab", () => {
    expect(isSpam(normalizeUsebasin({ name: "B", _gotcha: "" }))).toBe(true);
  });
  it("normalisiert einen gueltigen Eingang", () => {
    const r = normalizeUsebasin({
      name: "Andrea Sommer",
      funktion: "Energiemanagerin",
      kommune: "Kaufbeuren",
      email: "a.sommer@kaufbeuren.example",
    });
    expect(isSpam(r)).toBe(false);
    expect((r as RawLead).source).toBe("usebasin");
  });
});

describe("normalize luma", () => {
  it("liest Antworten + Event-Kontext", () => {
    const r = normalizeLuma({
      name: "Markus",
      email: "m@g.de",
      answers: { kommune: "Gersthofen", funktion: "Hochbau", anrede: "Herr" },
      event: { id: "e1", name: "Webinar", start_at: "2026-06-12T16:00:00Z" },
    });
    expect(isSpam(r)).toBe(false);
    const lead = r as RawLead;
    expect(lead.webinar?.date).toBe("2026-06-12");
    expect(lead.funktion).toBe("Hochbau");
  });
});

describe("routeLead Archetyp-Weiche", () => {
  it("BY -> Daniel, ins Cockpit", () => {
    const lead = normalizeUsebasin({
      name: "A", funktion: "Energiemanagerin", kommune: "Kaufbeuren", email: "a@k.de",
    }) as RawLead;
    const routed = routeLead(lead);
    expect(routed.archetype).toBe("BY");
    expect(routed.owner).toBe("Daniel Schaefers");
    expect(routed.enters_call_cockpit).toBe(true);
  });

  it("BW -> Jonas, ohne Anrufliste", () => {
    const lead = normalizeUsebasin({
      name: "K", funktion: "Bauamtsleiter", kommune: "Ravensburg", email: "k@r.de",
    }) as RawLead;
    const routed = routeLead(lead);
    expect(routed.archetype).toBe("BW");
    expect(routed.owner).toBe("Jonas Hofheinz");
    expect(routed.enters_call_cockpit).toBe(false);
  });

  it("unbekannte Kommune -> needs_review", () => {
    const lead = normalizeUsebasin({
      name: "P", funktion: "Klimaschutzmanagerin", kommune: "Kleinkleckersdorf", email: "p@k.de",
    }) as RawLead;
    const routed = routeLead(lead);
    expect(routed.archetype).toBe("unknown");
    expect(routed.needs_review).toBe(true);
  });

  it("LUMA -> Stage neu_webinar, usebasin -> im_gespraech", () => {
    const luma = normalizeLuma({
      email: "m@g.de", answers: { kommune: "Gersthofen", funktion: "Hochbau" },
    }) as RawLead;
    const basin = normalizeUsebasin({
      name: "A", kommune: "Kaufbeuren", email: "a@k.de", funktion: "Energiemanagerin",
    }) as RawLead;
    expect(routeLead(luma).target_stage).toBe("neu_webinar");
    expect(routeLead(basin).target_stage).toBe("im_gespraech");
  });
});

describe("Sales-Benachrichtigung", () => {
  it("ist guardrail-konform und enthaelt Kernfelder", () => {
    const lead = normalizeUsebasin({
      name: "Andrea Sommer", funktion: "Energiemanagerin", kommune: "Kaufbeuren", email: "a@k.de",
    }) as RawLead;
    const text = buildLeadNotification(routeLead(lead));
    expect(lint(text)).toHaveLength(0);
    expect(text).toContain("Kaufbeuren");
    expect(text).toContain("Daniel Schaefers");
    expect(text).toContain("Aufhaenger:");
  });
});

describe("processLeads (Integration ueber Fixture)", () => {
  it("routet gueltige Leads und weist Spam/Fehlerhaftes ab", async () => {
    const fixture = JSON.parse(
      readFileSync(join(process.cwd(), "test", "sample-leads.json"), "utf8"),
    ) as LeadEnvelope[];
    const sink = new MockLeadSink();
    const results = await processLeads(fixture, sink);

    const routed = results.filter((r) => r.ok);
    const rejected = results.filter((r) => !r.ok);
    expect(routed.length).toBe(4); // 2x BY/BW usebasin + 1 LUMA + 1 unbekannte Geo
    expect(rejected.length).toBe(1); // Honeypot-Spam
    expect(sink.writes.length).toBe(4);
    // Jede Benachrichtigung guardrail-konform.
    for (const r of routed) expect(lint(r.notification!)).toHaveLength(0);
  });
});
