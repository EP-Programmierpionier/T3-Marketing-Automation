// Pipeline-Sync (Blueprint Section 3E): Abgleich Projekt-Explorer (Money-Stages)
// <-> Brevo-Deals. Findet Inkonsistenzen und schlaegt Stage-/Betrags-Korrekturen
// vor. Bidirektional gedacht: ein angenommenes Angebot -> Deal auf "Won" heben +
// Attribution zurueckschreiben (Vorschlag, kein Auto-Write in Phase 0).

import type { Deal } from "../types.ts";
import type { ExplorerAngebot } from "../../mcp/projekt-explorer/adapter.ts";

export type DiscrepancyKind =
  | "advance_to_won" // Explorer: angenommen, Brevo noch "Angebot versendet"
  | "amount_mismatch" // Betrag Explorer != Brevo
  | "missing_in_brevo" // Explorer-Angebot ohne Brevo-Deal
  | "missing_in_explorer"; // Brevo-Angebot/Won ohne Explorer-Eintrag

export interface Discrepancy {
  kind: DiscrepancyKind;
  deal_id: string;
  kommune: string;
  detail: string;
  suggestion: string;
}

const MONEY_STAGES = new Set(["angebot_versendet", "won"]);

export function reconcile(explorer: ExplorerAngebot[], deals: Deal[]): Discrepancy[] {
  const dealById = new Map(deals.map((d) => [d.id, d]));
  const explorerByDeal = new Map(explorer.map((e) => [e.deal_id, e]));
  const out: Discrepancy[] = [];

  for (const e of explorer) {
    const deal = dealById.get(e.deal_id);
    if (!deal) {
      out.push({
        kind: "missing_in_brevo",
        deal_id: e.deal_id,
        kommune: e.kommune,
        detail: `Explorer-Angebot (${e.status}, ${e.betrag_eur} EUR) ohne Brevo-Deal.`,
        suggestion: "Brevo-Deal anlegen oder Verknuepfung pruefen.",
      });
      continue;
    }
    if (e.status === "angenommen" && deal.stage !== "won") {
      out.push({
        kind: "advance_to_won",
        deal_id: e.deal_id,
        kommune: e.kommune,
        detail: `Explorer: angenommen (${e.datum}), Brevo-Stage: ${deal.stage}.`,
        suggestion: `Deal auf "Won" heben (${e.betrag_eur.toLocaleString("de-DE")} EUR) + Attribution zurueckschreiben.`,
      });
    }
    if (deal.revenue_eur > 0 && deal.revenue_eur !== e.betrag_eur) {
      out.push({
        kind: "amount_mismatch",
        deal_id: e.deal_id,
        kommune: e.kommune,
        detail: `Betrag Brevo ${deal.revenue_eur.toLocaleString("de-DE")} EUR != Explorer ${e.betrag_eur.toLocaleString("de-DE")} EUR.`,
        suggestion: "Betrag abgleichen (Explorer ist Money-Stage-Quelle).",
      });
    }
  }

  for (const d of deals) {
    if (MONEY_STAGES.has(d.stage) && !explorerByDeal.has(d.id)) {
      out.push({
        kind: "missing_in_explorer",
        deal_id: d.id,
        kommune: d.kommune,
        detail: `Brevo-Deal in Money-Stage "${d.stage}" ohne Explorer-Eintrag.`,
        suggestion: "Angebots-Status im Projekt-Explorer ergaenzen.",
      });
    }
  }

  return out;
}
