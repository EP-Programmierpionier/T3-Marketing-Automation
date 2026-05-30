import { describe, expect, it } from "vitest";
import { buildCockpit } from "../agents/call-cockpit/run.ts";
import { renderMarkdown } from "../lib/teams/message.ts";

const TODAY = "2026-05-30";

describe("buildCockpit (Integration, BY/Daniel)", () => {
  it("filtert auf Bayern - keine BW-Kommunen in der Worklist", async () => {
    const view = await buildCockpit(TODAY);
    const kommunen = view.items.map((i) => i.deal.kommune);
    expect(kommunen).not.toContain("Tuebingen");
    expect(kommunen).not.toContain("Ravensburg");
    expect(view.items.every((i) => i.deal.bundesland === "BY")).toBe(true);
  });

  it("rendert eine Markdown-Tagesnachricht mit Kernblöcken", async () => {
    const view = await buildCockpit(TODAY);
    const md = renderMarkdown(view);
    expect(md).toContain("Call-Cockpit");
    expect(md).toContain("Daniel Schaefers");
    expect(md).toContain("Tagesquote");
    expect(md).toContain("Kapazitaets-Hinweis");
    expect(md).toContain("Close-Queue");
    expect(md).toContain("Brevo-Deal");
  });
});
