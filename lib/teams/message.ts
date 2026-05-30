// Rendert die Call-Cockpit-Tagesnachricht (Projekt-Brief Section 10 / Blueprint Section 9).
// Zwei Ausgaben:
//   - Markdown (sofort vorfuehrbar, Konsole/Datei; Teams rendert Markdown)
//   - Adaptive Card (JSON) fuer die spaetere echte Zustellung via M365-MCP.

import type { PrioritizedItem, Queue } from "../types.ts";
import type { CapacitySignal } from "../prioritization/capacity.ts";
import { getFunnelSollConfig, stageMap } from "../config.ts";

export interface CockpitMeta {
  today: string;
  ownerName: string; // "Daniel Schaefers"
  bundesland: string; // "BY"
}

export interface CockpitView {
  meta: CockpitMeta;
  items: PrioritizedItem[];
  capacity: CapacitySignal;
}

const QUEUE_TITLE: Record<Queue, string> = {
  close: "1) Close-Queue - offene Angebote nachtelefonieren (hoechste EUR-Prio)",
  reachout: "3) Reach-out-Queue - halbwarme Erstansprache",
  data_chase: "4) Daten-Chase - Excel-Ruecklauf anmahnen",
  park: "Park",
};

const QUEUE_ORDER: Queue[] = ["close", "reachout", "data_chase"];

function fmtEur(n: number): string {
  return n.toLocaleString("de-DE") + " EUR";
}

/** Tagesquote-Block: Soll aus Config, "Angebot" als verfuegbares Arbeitsvolumen. */
function quotaBlock(items: PrioritizedItem[]): string {
  const q = getFunnelSollConfig().tagesquote;
  const overdue = items.filter((i) => i.overdue_days > 0).length;
  const calls = items.filter((i) => i.queue !== "close").length;
  const closes = items.filter((i) => i.queue === "close").length;
  return [
    `**Tagesquote (Soll):** min. ${q.min_anrufe_pro_tag} Anrufe + ${q.min_gespraeche_pro_tag} Gespraech/Tag.`,
    `**Heute in der Worklist:** ${items.length} Eintraege | ${overdue} ueberfaellig | ${closes} offene Angebote | ${calls} Reach-out/Chase.`,
    `_Ist-Aktivitaet (gefuehrte Anrufe/Gespraeche) wird in Phase 1 aus der Brevo-Timeline gespiegelt._`,
  ].join("\n");
}

function capacityBlock(cap: CapacitySignal): string {
  const status = cap.bafaFull
    ? `**ausgelastet** (${cap.openBafaDeals} offene BAFA-Deals >= Kapazitaet ${cap.monthlyBafaCapacity}/Monat bei ${cap.fte} FTE) -> GEKO/GEKO-light-Leads bevorzugen`
    : `frei (${cap.openBafaDeals} von ${cap.monthlyBafaCapacity} BAFA-Slots/Monat belegt)`;
  return `**Kapazitaets-Hinweis (BAFA):** ${status}.`;
}

function itemLine(item: PrioritizedItem, idx: number): string {
  const d = item.deal;
  const sm = stageMap();
  const stageLabel = sm.get(d.stage)?.label ?? d.stage;
  const overdue =
    item.overdue_days > 0
      ? `**${item.overdue_days} Tage ueberfaellig**`
      : `${item.days_since_activity} Tage seit letzter Aktivitaet`;
  const eur = d.revenue_eur > 0 ? ` | ${fmtEur(d.revenue_eur)}` : "";
  const funktion = d.contact.funktion ? ` (${d.contact.funktion})` : "";
  return [
    `${idx}. **${d.kommune}** - ${d.contact.name}${funktion} | _${stageLabel}_ | ${overdue}${eur}`,
    `   - Aufhaenger: ${item.opener}`,
    `   - Persona: ${d.persona} | ICP-Fit ${d.icp_fit.toFixed(2)} | [Brevo-Deal](${d.deal_url})`,
  ].join("\n");
}

/** Voller Markdown-Body der Tagesnachricht. */
export function renderMarkdown(view: CockpitView): string {
  const { meta, items, capacity } = view;
  const lines: string[] = [];

  lines.push(`# Call-Cockpit - ${meta.today}`);
  lines.push(`Fuer **${meta.ownerName}** (Bundesland ${meta.bundesland}, Archetyp Proaktiv-Call)`);
  lines.push("");
  lines.push(quotaBlock(items));
  lines.push("");
  lines.push(capacityBlock(capacity));
  lines.push("");

  // Hinweis: ueberfaellige sind durch den Score bereits ueberall oben.
  const overdueCount = items.filter((i) => i.overdue_days > 0).length;
  if (overdueCount > 0) {
    lines.push(`> **${overdueCount} ueberfaellige Next-Actions** stehen in ihren Queues jeweils zuoberst (Pflicht-Top des Tages).`);
    lines.push("");
  }

  let runningIdx = 1;
  for (const queue of QUEUE_ORDER) {
    const queueItems = items.filter((i) => i.queue === queue);
    if (queueItems.length === 0) continue;
    lines.push(`## ${QUEUE_TITLE[queue]} (${queueItems.length})`);
    lines.push("");
    for (const item of queueItems) {
      lines.push(itemLine(item, runningIdx++));
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(`_Generiert vom Call-Cockpit (Phase 0, Mock-Daten). Quelle: Projekt-Brief Section 10._`);
  return lines.join("\n");
}

/**
 * Adaptive Card (vereinfacht) fuer die spaetere Teams-Zustellung via M365-MCP.
 * Bewusst schlank gehalten; die volle Liste steckt als Markdown-TextBlock drin.
 */
export function renderAdaptiveCard(view: CockpitView): object {
  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        size: "Large",
        weight: "Bolder",
        text: `Call-Cockpit - ${view.meta.today}`,
      },
      {
        type: "TextBlock",
        isSubtle: true,
        text: `${view.meta.ownerName} | ${view.meta.bundesland} | ${view.items.length} Eintraege`,
      },
      {
        type: "TextBlock",
        wrap: true,
        text: renderMarkdown(view),
      },
    ],
  };
}
