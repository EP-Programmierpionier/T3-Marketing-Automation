import { describe, expect, it } from "vitest";
import { getBrevoMappingConfig } from "../lib/config.ts";
import {
  mapBrevoDeal,
  mapStageLabel,
  summarizeTasks,
  type BrevoContact,
  type BrevoDeal,
  type BrevoTask,
} from "../mcp/brevo/mapping.ts";

const cfg = getBrevoMappingConfig();

describe("mapStageLabel", () => {
  it("mappt bekannte Brevo-Labels auf StageKeys", () => {
    expect(mapStageLabel("Angebot versendet", cfg)).toBe("angebot_versendet");
    expect(mapStageLabel("Neu / Webinarteilnahme", cfg)).toBe("neu_webinar");
  });
  it("faellt bei unbekanntem Label auf 'alt' zurueck", () => {
    expect(mapStageLabel("Irgendwas", cfg)).toBe("alt");
    expect(mapStageLabel(undefined, cfg)).toBe("alt");
  });
});

describe("summarizeTasks", () => {
  it("nimmt frueheste offene Task als Faelligkeit/Next-Action", () => {
    const tasks: BrevoTask[] = [
      { id: "t1", taskTypeName: "Call", date: "2026-05-20", done: false },
      { id: "t2", taskTypeName: "Email", date: "2026-05-10", done: false },
      { id: "t3", taskTypeName: "Call", date: "2026-05-01", done: true },
    ];
    const ctx = summarizeTasks(tasks, cfg);
    expect(ctx.due_date).toBe("2026-05-10");
    expect(ctx.next_action).toBe("email");
    expect(ctx.last_activity).toBe("2026-05-20"); // juengstes Datum gesamt
  });

  it("liefert leeren Kontext ohne Tasks", () => {
    expect(summarizeTasks([], cfg)).toEqual({});
  });
});

describe("mapBrevoDeal", () => {
  it("mappt Roh-Deal + Kontakt + Task-Kontext auf das Deal-Modell", () => {
    const raw: BrevoDeal = {
      id: "D-42",
      attributes: {
        deal_name: "Stadt Musterhausen",
        amount: 14900,
        deal_owner: "Daniel Schaefers",
        kommune: "Musterhausen",
        bundesland: "by",
        einwohner: "30000",
        produktlinie: "bafa",
        n_bafa: 2,
      },
      linkedContactsIds: [7],
    };
    const contact: BrevoContact = {
      id: 7,
      email: "s.vogt@musterhausen.example",
      attributes: { FIRSTNAME: "Sabine", LASTNAME: "Vogt", FUNKTION: "Klimaschutzmanagerin" },
    };
    const deal = mapBrevoDeal(
      raw,
      contact,
      { due_date: "2026-05-18", next_action: "call", last_activity: "2026-05-12" },
      cfg,
      "Angebot versendet",
    );

    expect(deal.id).toBe("D-42");
    expect(deal.stage).toBe("angebot_versendet");
    expect(deal.bundesland).toBe("BY");
    expect(deal.einwohner).toBe(30000);
    expect(deal.revenue_eur).toBe(14900);
    expect(deal.contact.name).toBe("Sabine Vogt");
    expect(deal.contact.funktion).toBe("Klimaschutzmanagerin");
    expect(deal.due_date).toBe("2026-05-18");
    expect(deal.next_action).toBe("call");
    expect(deal.deal_url).toContain("D-42");
  });
});
