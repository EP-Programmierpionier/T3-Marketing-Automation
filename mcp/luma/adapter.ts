// LUMA-Anbindung hinter Adapter-Interface (analog Brevo). Phase 0 = Mock,
// Phase 1 = echte LUMA-REST-API (benoetigt LUMA_API_KEY + AVV/SCC wegen
// US-Transfer, Projekt-Brief Section 9).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { LumaEvent, LumaRegistration } from "../../lib/webinar/types.ts";

export interface LumaSource {
  readonly name: string;
  listEvents(): Promise<LumaEvent[]>;
  listRegistrations(eventId: string): Promise<LumaRegistration[]>;
}

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_MOCK = join(here, "..", "..", "test", "mock-luma.json");

interface MockShape {
  events: LumaEvent[];
  registrations: Record<string, LumaRegistration[]>;
}

/** Phase 0: liest Events + Registrierungen aus einer JSON-Fixture. */
export class MockLumaAdapter implements LumaSource {
  readonly name = "mock";
  constructor(private readonly fixturePath: string = DEFAULT_MOCK) {}

  private load(): MockShape {
    return JSON.parse(readFileSync(this.fixturePath, "utf8")) as MockShape;
  }

  async listEvents(): Promise<LumaEvent[]> {
    return this.load().events;
  }

  async listRegistrations(eventId: string): Promise<LumaRegistration[]> {
    return this.load().registrations[eventId] ?? [];
  }
}

/**
 * Phase 1: echte LUMA-API. Bewusst gated - benoetigt LUMA_API_KEY und
 * AVV/SCC (US-Transfer). Interface identisch, daher reines Einhaengen spaeter.
 */
export class RestLumaAdapter implements LumaSource {
  readonly name = "luma";
  constructor(private readonly apiKey: string) {}

  async listEvents(): Promise<LumaEvent[]> {
    if (!this.apiKey) throw new Error("LUMA_API_KEY fehlt.");
    throw new Error("RestLumaAdapter noch nicht aktiviert (Phase 1): LUMA_API_KEY + AVV/SCC noetig.");
  }
  async listRegistrations(_eventId: string): Promise<LumaRegistration[]> {
    if (!this.apiKey) throw new Error("LUMA_API_KEY fehlt.");
    throw new Error("RestLumaAdapter noch nicht aktiviert (Phase 1): LUMA_API_KEY + AVV/SCC noetig.");
  }
}

export function getLumaSource(): LumaSource {
  const src = (process.env.LUMA_SOURCE ?? "mock").toLowerCase();
  if (src === "luma") return new RestLumaAdapter(process.env.LUMA_API_KEY ?? "");
  return new MockLumaAdapter();
}
