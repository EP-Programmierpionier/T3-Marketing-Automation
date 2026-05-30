// Gemeinde-Lookup: Kommune-Name -> Bundesland + Einwohner.
// Seed aus config/gemeinden.yaml (Demo/Tests). Phase 1: amtliches
// Gemeindeverzeichnis (Destatis/AGS) als Quelle einhaengen.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import yaml from "js-yaml";
import type { Bundesland } from "../types.ts";

export interface GemeindeInfo {
  bundesland: Bundesland;
  einwohner: number;
}

interface GemeindenConfig {
  gemeinden: { name: string; bundesland: Bundesland; einwohner: number }[];
}

const here = dirname(fileURLToPath(import.meta.url));
const CONFIG = join(here, "..", "..", "config", "gemeinden.yaml");

/** Normalisiert Namen fuer robustes Matching (lowercase, Umlaut-Transliteration). */
export function normalizeGemeinde(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ");
}

let _index: Map<string, GemeindeInfo> | undefined;

function index(): Map<string, GemeindeInfo> {
  if (_index) return _index;
  const cfg = yaml.load(readFileSync(CONFIG, "utf8")) as GemeindenConfig;
  const m = new Map<string, GemeindeInfo>();
  for (const g of cfg.gemeinden) {
    m.set(normalizeGemeinde(g.name), { bundesland: g.bundesland, einwohner: g.einwohner });
  }
  _index = m;
  return m;
}

/** Liefert Bundesland+Einwohner oder undefined (dann manuelle Geo-Pruefung noetig). */
export function resolveGemeinde(name: string | undefined): GemeindeInfo | undefined {
  if (!name) return undefined;
  return index().get(normalizeGemeinde(name));
}
