import { describe, expect, it } from "vitest";
import { selectPastEvents, selectUpcomingEvents } from "../lib/webinar/select.ts";
import { buildInvitation, buildUtmUrl } from "../lib/webinar/invite.ts";
import { planFollowups } from "../lib/webinar/followup.ts";
import { MockLumaAdapter } from "../mcp/luma/adapter.ts";
import { buildWebinarRun } from "../agents/webinar-orchestrator/run.ts";
import { lint } from "../lib/texting/guardrails.ts";

const TODAY = "2026-05-30";

describe("Event-Auswahl", () => {
  it("filtert Tag Kommunen + zukuenftig und sortiert aufsteigend", async () => {
    const events = await new MockLumaAdapter().listEvents();
    const up = selectUpcomingEvents(events, TODAY);
    expect(up.length).toBe(2); // KWP 06-12 + GEG 06-25 (Investoren-Event raus)
    expect(up[0]!.id).toBe("evt_kwp_0612");
    expect(up.every((e) => e.tags.includes("Kommunen"))).toBe(true);
  });
  it("findet vergangene Kommunen-Events", async () => {
    const events = await new MockLumaAdapter().listEvents();
    const past = selectPastEvents(events, TODAY);
    expect(past[0]!.id).toBe("evt_kwp_0508");
  });
});

describe("Einladung", () => {
  it("baut UTM-URL", () => {
    const url = buildUtmUrl("https://luma.com/x", "evt1", "BY");
    expect(url).toContain("utm_source=brevo");
    expect(url).toContain("utm_campaign=webinar_evt1");
    expect(url).toContain("utm_content=by");
  });
  it("ist guardrail-konform (kein FOMO) und segment-spezifisch", async () => {
    const event = (await new MockLumaAdapter().listEvents())[0]!;
    const bw = buildInvitation(event, "BW");
    const by = buildInvitation(event, "BY");
    expect(lint(bw.body)).toHaveLength(0);
    expect(lint(by.body)).toHaveLength(0);
    expect(bw.body).toContain("Baden-Wuerttemberg");
    expect(by.body).toContain("bayerische");
  });
});

describe("Post-Webinar Follow-up", () => {
  it("trennt attended/no_show und routet per Archetyp", async () => {
    const luma = new MockLumaAdapter();
    const event = (await luma.listEvents()).find((e) => e.id === "evt_kwp_0508")!;
    const plans = planFollowups(event, await luma.listRegistrations(event.id));

    const kauf = plans.find((p) => p.kommune === "Kaufbeuren")!;
    expect(kauf.status).toBe("attended");
    expect(kauf.archetype).toBe("BY");
    expect(kauf.create_call_task).toBe(true); // attended + BY

    const tueb = plans.find((p) => p.kommune === "Tuebingen")!;
    expect(tueb.status).toBe("attended");
    expect(tueb.archetype).toBe("BW");
    expect(tueb.create_call_task).toBe(false); // BW -> kein Call

    const dachau = plans.find((p) => p.kommune === "Dachau")!;
    expect(dachau.status).toBe("no_show");
    expect(dachau.create_call_task).toBe(false);
  });

  it("erzeugt guardrail-konforme Follow-up-Mails", async () => {
    const luma = new MockLumaAdapter();
    const event = (await luma.listEvents()).find((e) => e.id === "evt_kwp_0508")!;
    const plans = planFollowups(event, await luma.listRegistrations(event.id));
    for (const p of plans) {
      expect(lint(p.mail_subject)).toHaveLength(0);
      expect(lint(p.mail_body)).toHaveLength(0);
    }
  });
});

describe("buildWebinarRun (Integration)", () => {
  it("liefert Einladungen (BW+BY) + Follow-ups", async () => {
    const run = await buildWebinarRun(TODAY);
    expect(run.invitations.map((i) => i.segment)).toEqual(["BW", "BY"]);
    expect(run.followups.length).toBe(5);
    expect(run.pastEvent?.id).toBe("evt_kwp_0508");
  });
});
