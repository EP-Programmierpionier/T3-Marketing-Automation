// PII-freier Brevo-Verbindungs-Check.
// Liest NUR die Pipelines + Stage-Namen (keine Deals, keine Kontakte, keine
// personenbezogenen Daten) und gleicht die Stage-Labels gegen
// config/brevo-mapping.yaml ab. Dient (a) als Erreichbarkeits-/Key-Test und
// (b) zur Bestaetigung des Stage-Mappings (offener Punkt 12.2).
//
// Aufruf: BREVO_API_KEY=... npx tsx tools/brevo-check.ts
// Gibt den Key NIEMALS aus.

import { BrevoClient } from "../mcp/brevo/rest.ts";
import { getBrevoMappingConfig } from "../lib/config.ts";

async function main(): Promise<void> {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    console.error("BREVO_API_KEY nicht gesetzt. Abbruch (kein Live-Call).");
    process.exit(2);
  }

  const cfg = getBrevoMappingConfig();
  const client = new BrevoClient(key);

  console.log("Verbinde mit Brevo (nur Pipeline-Metadaten, keine PII) ...");
  const pipelines = await client.getPipelines();
  console.log(`OK - ${pipelines.length} Pipeline(s) gelesen.\n`);

  const target =
    pipelines.find((p) => cfg.pipeline_id && p.pipeline === cfg.pipeline_id) ??
    pipelines.find((p) => p.pipeline_name === cfg.pipeline_name) ??
    pipelines[0];

  for (const p of pipelines) {
    const marker = p === target ? " (Ziel-Pipeline)" : "";
    console.log(`Pipeline: "${p.pipeline_name ?? "(ohne Name)"}"${marker}`);
    for (const s of p.stages ?? []) {
      const mapped = cfg.stage_label_to_key[s.name];
      const status = mapped ? `-> ${mapped}` : "-> NICHT GEMAPPT (in brevo-mapping.yaml ergaenzen)";
      console.log(`   - "${s.name}"  ${status}`);
    }
    console.log("");
  }

  // Mapping-Eintraege, die in der Pipeline nicht (mehr) vorkommen.
  const liveLabels = new Set((target?.stages ?? []).map((s) => s.name));
  const stale = Object.keys(cfg.stage_label_to_key).filter((l) => !liveLabels.has(l));
  if (stale.length > 0) {
    console.log("Hinweis - in der Config gemappt, aber nicht in der Ziel-Pipeline gefunden:");
    for (const l of stale) console.log(`   - "${l}"`);
  } else {
    console.log("Alle Config-Labels kommen in der Ziel-Pipeline vor.");
  }
}

main().catch((err) => {
  console.error("Verbindungs-Check fehlgeschlagen:", (err as Error).message);
  process.exit(1);
});
