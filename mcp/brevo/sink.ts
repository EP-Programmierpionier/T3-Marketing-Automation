// Schreibseite fuer den Lead-Router: Contact-Upsert + Deal anlegen/heben.
// Hinter einem Interface (analog zur Leseseite), damit Phase 0 gegen einen
// Mock laeuft und Phase 1 den echten Brevo-REST-Write einhaengt.

import type { RoutedLead } from "../../lib/lead-router/types.ts";

export interface UpsertResult {
  contact_id: string;
  deal_id: string;
  created_contact: boolean;
  created_deal: boolean;
}

export interface LeadSink {
  readonly name: string;
  upsert(routed: RoutedLead): Promise<UpsertResult>;
}

/** Phase 0: protokolliert die Schreib-Absichten, ohne extern zu schreiben. */
export class MockLeadSink implements LeadSink {
  readonly name = "mock";
  readonly writes: { routed: RoutedLead; result: UpsertResult }[] = [];

  async upsert(routed: RoutedLead): Promise<UpsertResult> {
    // Deterministische Pseudo-IDs aus dem contact_uid (fuer Demo/Tests).
    const short = routed.contact_uid.slice(0, 10);
    const result: UpsertResult = {
      contact_id: `c_${short}`,
      deal_id: `d_${short}`,
      created_contact: true,
      created_deal: true,
    };
    this.writes.push({ routed, result });
    return result;
  }
}

/**
 * Phase 1: echter Brevo-Write. Bewusst noch nicht aktiv - CRM-Mutationen
 * (POST /v3/contacts, POST /v3/crm/deals) erst nach Bestaetigung der exakten
 * Custom-Field-Namen (offener Punkt 12.2) und mit AVV. Das Interface ist
 * identisch, daher reines Einhaengen ohne Aenderung am Lead-Router.
 */
export class RestLeadSink implements LeadSink {
  readonly name = "brevo";
  constructor(private readonly apiKey: string) {}

  async upsert(_routed: RoutedLead): Promise<UpsertResult> {
    if (!this.apiKey) throw new Error("BREVO_API_KEY fehlt.");
    throw new Error(
      "RestLeadSink (CRM-Write) ist noch nicht aktiviert. Voraussetzung: " +
        "bestaetigte Custom-Field-Namen (12.2) + AVV. Schreibpfad bewusst gated.",
    );
  }
}

/** Waehlt die Schreibseite anhand LEAD_SINK (mock|brevo). */
export function getLeadSink(): LeadSink {
  const sink = (process.env.LEAD_SINK ?? "mock").toLowerCase();
  if (sink === "brevo") return new RestLeadSink(process.env.BREVO_API_KEY ?? "");
  return new MockLeadSink();
}
