import { describe, expect, it, vi } from "vitest";
import { buildCockpit } from "../agents/call-cockpit/run.ts";
import { deliverToTeams } from "../agents/call-cockpit/deliver.ts";

const TODAY = "2026-05-30";

describe("deliverToTeams", () => {
  it("ueberspringt ohne Webhook-URL (return false)", async () => {
    const view = await buildCockpit(TODAY);
    const sent = await deliverToTeams(view, undefined);
    expect(sent).toBe(false);
  });

  it("postet eine Adaptive-Card im Teams-Attachment-Format", async () => {
    const view = await buildCockpit(TODAY);
    const fetchStub = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) => new Response(null, { status: 200 }),
    );
    const sent = await deliverToTeams(view, "https://example.test/hook", fetchStub as unknown as typeof fetch);

    expect(sent).toBe(true);
    expect(fetchStub).toHaveBeenCalledOnce();
    const init = fetchStub.mock.calls[0]![1]!;
    const body = JSON.parse(init.body as string);
    expect(body.type).toBe("message");
    expect(body.attachments[0].contentType).toBe("application/vnd.microsoft.card.adaptive");
    expect(body.attachments[0].content.type).toBe("AdaptiveCard");
  });

  it("wirft bei Webhook-Fehlerstatus", async () => {
    const view = await buildCockpit(TODAY);
    const fetchStub = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        new Response("no", { status: 400, statusText: "Bad Request" }),
    );
    await expect(
      deliverToTeams(view, "https://example.test/hook", fetchStub as unknown as typeof fetch),
    ).rejects.toThrow(/400/);
  });
});
