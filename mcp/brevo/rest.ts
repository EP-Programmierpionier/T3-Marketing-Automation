// Low-Level Brevo-CRM-REST-Client (Deals/Contacts/Tasks/Pipelines).
// Native fetch (Node >= 18), Pagination + einfacher 429-Backoff.
// Doku: https://developers.brevo.com (CRM-Endpunkte).
//
// Kein Netzwerkzugriff in Tests: die Mapping-Logik liegt rein in mapping.ts.

import type { BrevoContact, BrevoDeal, BrevoTask } from "./mapping.ts";

const BASE = "https://api.brevo.com/v3";

export interface BrevoPipelineStage {
  id: string;
  name: string;
}
export interface BrevoPipeline {
  pipeline: string; // id
  pipeline_name?: string;
  stages: BrevoPipelineStage[];
}

export class BrevoClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    if (!apiKey) throw new Error("BREVO_API_KEY fehlt.");
  }

  private async request<T>(path: string): Promise<T> {
    const url = path.startsWith("http") ? path : `${BASE}${path}`;
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await this.fetchImpl(url, {
        headers: { "api-key": this.apiKey, accept: "application/json" },
      });
      if (res.status === 429) {
        // Rate-Limit: exponentielles Backoff (1s, 2s, 4s).
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
      if (!res.ok) {
        throw new Error(`Brevo ${res.status} ${res.statusText} fuer ${url}`);
      }
      return (await res.json()) as T;
    }
    throw new Error(`Brevo Rate-Limit nicht aufgeloest fuer ${url}`);
  }

  /** Alle Pipelines mit Stages (zum Aufloesen Stage-ID -> Label). */
  async getPipelines(): Promise<BrevoPipeline[]> {
    const data = await this.request<BrevoPipeline[] | BrevoPipeline>("/crm/pipelines/details");
    return Array.isArray(data) ? data : [data];
  }

  /** Alle Deals (paginiert, limit 50). */
  async listDeals(): Promise<BrevoDeal[]> {
    const out: BrevoDeal[] = [];
    const limit = 50;
    for (let offset = 0; ; offset += limit) {
      const page = await this.request<{ items?: BrevoDeal[] }>(
        `/crm/deals?limit=${limit}&offset=${offset}`,
      );
      const items = page.items ?? [];
      out.push(...items);
      if (items.length < limit) break;
    }
    return out;
  }

  /** Alle offenen + erledigten Tasks (paginiert). */
  async listTasks(): Promise<BrevoTask[]> {
    const out: BrevoTask[] = [];
    const limit = 50;
    for (let offset = 0; ; offset += limit) {
      const page = await this.request<{ items?: BrevoTask[] }>(
        `/crm/tasks?limit=${limit}&offset=${offset}`,
      );
      const items = page.items ?? [];
      out.push(...items);
      if (items.length < limit) break;
    }
    return out;
  }

  /** Einzelkontakt per ID (fuer E-Mail/Name/Funktion). */
  async getContact(id: number): Promise<BrevoContact | undefined> {
    try {
      return await this.request<BrevoContact>(`/contacts/${id}`);
    } catch {
      return undefined;
    }
  }
}
