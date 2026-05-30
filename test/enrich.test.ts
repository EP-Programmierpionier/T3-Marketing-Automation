import { describe, expect, it } from "vitest";
import { classifyPersona, icpFit, enrichDeal } from "../lib/spine/enrich.ts";
import { contactUid } from "../lib/spine/contact-uid.ts";
import type { Deal } from "../lib/types.ts";

describe("persona-classify", () => {
  it("erkennt die Kern-Personas aus dem Funktions-Freitext", () => {
    expect(classifyPersona("Bauamtsleiter")).toBe("bauamt");
    expect(classifyPersona("Kaemmerer")).toBe("kaemmerei");
    expect(classifyPersona("Erster Buergermeister")).toBe("buergermeister");
    expect(classifyPersona("Klimaschutzmanagerin")).toBe("klima_energiemanager");
  });

  it("faellt auf Klima/Energie zurueck (~60 % Default)", () => {
    expect(classifyPersona(undefined)).toBe("klima_energiemanager");
    expect(classifyPersona("Referent Stadtentwicklung")).toBe("klima_energiemanager");
  });
});

describe("icp-fit", () => {
  it("Zielband 10k-50k EW => hoher Fit", () => {
    expect(icpFit(30000, "klima_energiemanager")).toBe(1);
  });
  it("Grossstadt degradiert (Regel 4: nicht zuerst)", () => {
    expect(icpFit(120000, "bauamt")).toBeLessThan(icpFit(30000, "bauamt"));
  });
  it("unbekannte EW => neutral", () => {
    expect(icpFit(undefined, "klima_energiemanager")).toBeCloseTo(0.5, 5);
  });
});

describe("contact_uid", () => {
  it("ist stabil und normalisiert (trim + lowercase)", () => {
    expect(contactUid("A@B.de", "p")).toBe(contactUid("  a@b.de ", "p"));
  });
  it("haengt vom Pepper ab", () => {
    expect(contactUid("a@b.de", "p1")).not.toBe(contactUid("a@b.de", "p2"));
  });
});

describe("enrichDeal", () => {
  it("setzt persona, contact_uid und icp_fit", () => {
    const raw: Deal = {
      id: "X",
      deal_url: "u",
      kommune: "Musterstadt",
      bundesland: "BY",
      einwohner: 25000,
      owner: "Daniel Schaefers",
      stage: "neu_webinar",
      contact: { name: "Max", funktion: "Bauamtsleiter", email: "max@example.de" },
      revenue_eur: 0,
    };
    const e = enrichDeal(raw);
    expect(e.persona).toBe("bauamt");
    expect(e.contact_uid).toMatch(/^[0-9a-f]{64}$/);
    expect(e.icp_fit).toBeGreaterThan(0);
  });
});
