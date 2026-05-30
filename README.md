# T3 Marketing-Automation — Effizienzpioniere Kommunen

Closed-Loop Marketing-/Sales-Automation im Claude-Ökosystem für die
Energieberatung für Kommunen (BW + Bayern). **Erstes Artefakt: das
Call-Cockpit** — eine täglich priorisierte Anruf-Worklist für Daniel (Bayern,
Archetyp Proaktiv-Call), gepusht als Microsoft-Teams-Tagesnachricht.

Quellen der Wahrheit: `PROJEKT_BRIEF_MARKETING_AUTOMATION.md`,
`MARKETING_AUTOMATION_BLUEPRINT.md`, `MARKETING_AUTOMATION_CONTEXT.md`.

## Schnellstart (Phase 0, gegen Mock-Daten — kein Brevo-AVV nötig)

```bash
npm install
npm run cockpit          # erzeugt die Tagesnachricht aus test/mock-deals.json
npm run cockpit -- --today=2026-05-30   # mit festem Stichtag (reproduzierbar)
npm test                 # Unit- + Integrationstests
```

Die Tagesnachricht wird auf der Konsole ausgegeben und als Artefakt nach
`out/call-cockpit-<datum>.md` (Markdown) und `.card.json` (Adaptive Card)
geschrieben.

## Priorisierungs-Logik (Projekt-Brief §10)

1. **Überfällige** Next-Actions zuerst (`due_date` < heute).
2. **Close-Queue:** offene Angebote (`Angebot versendet`), €-gewichtet.
3. **Reach-out-Queue:** `Neu/Webinar → Versucht zu erreichen → Im Gespräch`,
   gewichtet nach ICP-Fit + Webinar-Aktualität.
4. **Daten-Chase:** `Daten angefragt` ohne Rücklauf.
5. **Kapazitäts-Hinweis:** bei vollem BAFA-Slot (FTE-Limit) GEKO/GEKO-light
   bevorzugen.

Die Ordnung ist als ein sortierbarer Score abgebildet (große Tier-Abstände),
tunebar in `config/prioritization.yaml`.

## Struktur (Projekt-Brief §11)

```
/agents/call-cockpit   run.ts (Agent) + deliver.ts (Teams/Datei)
/mcp/brevo             adapter.ts (Mock + REST-Stub hinter einem Interface)
/mcp/luma,/mcp/posthog Platzhalter (spätere Roadmap-Schritte)
/skills                texting-guardrails/ · persona-classify/ · attribution-model/
/lib/spine             contact_uid + Anreicherung (Persona, ICP-Fit)
/lib/prioritization    Scoring + Kapazität + Datums-Helfer
/lib/texting           guardrails.ts (Lint) + opener.ts (Aufhänger)
/lib/teams             message.ts (Markdown + Adaptive Card)
/config                plan-2026.yaml · funnel-soll.yaml · stages.yaml · prioritization.yaml
/knowledge             persona-trigger.md · zielgruppe.md · goldene-regeln-11.md
/test                  mock-deals.json + Tests
```

## Stack

TypeScript (Node ≥ 22), `tsx` als Runner, `vitest` für Tests, `js-yaml` für die
Config. Keine schweren Frameworks — Phase 0 ist bewusst sofort vorführbar.

## Adapter-Wechsel auf echte Daten (Phase 1)

`DEALS_SOURCE=brevo` schaltet von Mock auf den Brevo-REST-Adapter
(`mcp/brevo/adapter.ts`). Voraussetzungen (offener Punkt §12.2):
Brevo-AVV, `BREVO_API_KEY`, exakte Deal-Stage-IDs und Custom-Field-Namen
(`revenue_eur`, `produktlinie`, `bundesland`, `persona`). Secrets niemals
committen — siehe `.env.example`; produktiv via Azure Key Vault.

## Teams-Zustellung

Render-Ausgabe (Markdown + Adaptive Card) ist fertig. Der in dieser Umgebung
verbundene M365-MCP bietet aktuell nur Lese-Tools (Outlook/Kalender/SharePoint),
kein „Teams-Nachricht senden". Sobald ein Send-Tool / Incoming-Webhook /
Graph-`chatMessage` verfügbar ist, wird es in `agents/call-cockpit/deliver.ts`
eingehängt. Ziel-Channel + Uhrzeit sind offener Punkt §12.3.

## Roadmap (Wert-zuerst, §11)

1. Brevo-MCP + Spine ✅ (Skeleton) → 2. **Call-Cockpit** ✅ (Phase 0) →
3. Lead-Router → 4. Webinar-Orchestrator → 5. Pipeline-Sync + KAM →
6. Conversion-Analyst (Pacing) → 7. PostHog-Stitching → 8. Closed-Loop-Copy.
