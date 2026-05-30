// Zustellung der Tagesnachricht. Phase 0: Konsole + Datei-Artefakt unter out/.
// Phase 1: echte Teams-Zustellung via M365-MCP.
//
// WICHTIG (Stand heute): Der verbundene M365-MCP stellt in dieser Session nur
// LESE-Tools bereit (Outlook/Kalender/SharePoint-Suche, Meeting-Availability) -
// es gibt kein Tool zum Senden einer Teams-Nachricht. Daher schreibt Phase 0
// das Artefakt nach out/ und protokolliert es. Sobald ein Teams-"send"-Tool
// (oder ein Incoming-Webhook/Graph chatMessage) verfuegbar ist, wird es hier
// eingehaengt - die Render-Ausgabe (Markdown + Adaptive Card) ist bereits fertig.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { CockpitView } from "../../lib/teams/message.ts";
import { renderAdaptiveCard, renderMarkdown } from "../../lib/teams/message.ts";

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, "..", "..", "out");

export interface DeliveryResult {
  markdownPath: string;
  cardPath: string;
  markdown: string;
}

export type DeliveryChannel = "file" | "teams";

export function deliverToFiles(view: CockpitView): DeliveryResult {
  mkdirSync(OUT_DIR, { recursive: true });
  const markdown = renderMarkdown(view);
  const card = renderAdaptiveCard(view);

  const stamp = view.meta.today;
  const markdownPath = join(OUT_DIR, `call-cockpit-${stamp}.md`);
  const cardPath = join(OUT_DIR, `call-cockpit-${stamp}.card.json`);

  writeFileSync(markdownPath, markdown, "utf8");
  writeFileSync(cardPath, JSON.stringify(card, null, 2), "utf8");

  return { markdownPath, cardPath, markdown };
}

/**
 * Echte Teams-Zustellung via Incoming Webhook (Power Automate "Workflows" oder
 * O365-Connector). URL aus ENV TEAMS_WEBHOOK_URL. Postet die Adaptive Card im
 * von Teams erwarteten Attachment-Format.
 *
 * Hintergrund: Der in dieser Umgebung verbundene M365-MCP bietet nur Lese-Tools
 * (kein "Teams-Nachricht senden"); ein Incoming Webhook ist der robusteste,
 * tool-unabhaengige Zustellweg. Alternativ kann spaeter Graph `chatMessage`
 * (Application-Permission) hier eingehaengt werden.
 *
 * @returns true wenn zugestellt, false wenn kein Webhook konfiguriert ist.
 */
export async function deliverToTeams(
  view: CockpitView,
  webhookUrl = process.env.TEAMS_WEBHOOK_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!webhookUrl) return false;
  const card = renderAdaptiveCard(view);
  const payload = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: card,
      },
    ],
  };
  const res = await fetchImpl(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Teams-Webhook ${res.status} ${res.statusText}`);
  }
  return true;
}
