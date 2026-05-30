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
npm test                 # Unit- + Integrationstests (31)
npm run typecheck        # strikter TypeScript-Check
```

Echte Daten/Zustellung später per ENV zuschaltbar (siehe „Live-Schaltung"):
`DEALS_SOURCE=brevo`, `BREVO_API_KEY`, `TEAMS_WEBHOOK_URL`.

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
/mcp/brevo             adapter.ts (Mock + echter REST-Adapter) · rest.ts · mapping.ts
/mcp/luma,/mcp/posthog Platzhalter (spätere Roadmap-Schritte)
/skills                texting-guardrails/ · persona-classify/ · attribution-model/
/lib/spine             contact_uid + Anreicherung (Persona, ICP-Fit)
/lib/prioritization    Scoring + Kapazität + Datums-Helfer
/lib/texting           guardrails.ts (Lint) + opener.ts (Aufhänger)
/lib/teams             message.ts (Markdown + Adaptive Card)
/config                plan-2026.yaml · funnel-soll.yaml · stages.yaml · prioritization.yaml · brevo-mapping.yaml
/knowledge             persona-trigger.md · zielgruppe.md · goldene-regeln-11.md
/test                  mock-deals.json + Tests
```

## Stack

TypeScript (Node ≥ 22), `tsx` als Runner, `vitest` für Tests, `js-yaml` für die
Config. Keine schweren Frameworks — Phase 0 ist bewusst sofort vorführbar.

## Live-Schaltung (Phase 1)

Der Code ist **plug-and-play live-fähig**. Drei Schalter, alle über ENV/Secrets:

1. **Echte Brevo-Daten:** `DEALS_SOURCE=brevo` + `BREVO_API_KEY`. Der
   `RestBrevoAdapter` (`mcp/brevo/rest.ts` + `mcp/brevo/adapter.ts`) lädt
   Pipeline-Stages, Deals, Tasks (Fälligkeit/Next-Action) und den verknüpften
   Kontakt und mappt alles auf das kanonische Modell. Die Stage-Labels und
   Custom-Field-Namen stehen zentral in `config/brevo-mapping.yaml` — **dort vom
   Team bestätigen** (offener Punkt §12.2). Secrets niemals committen; produktiv
   via Azure Key Vault.
2. **Teams-Zustellung:** `TEAMS_WEBHOOK_URL` setzen (Power-Automate-„Workflows"-
   Incoming-Webhook oder O365-Connector). Das Cockpit postet dann die Adaptive
   Card direkt in den Ziel-Channel/-Chat. Ohne URL fällt es sauber auf die
   Datei-Ausgabe zurück. (Der verbundene M365-MCP bietet nur Lese-Tools, daher
   der Webhook-Weg; Graph-`chatMessage` lässt sich alternativ in
   `agents/call-cockpit/deliver.ts` einhängen.) Ziel-Channel + Uhrzeit =
   offener Punkt §12.3.
3. **Tages-Trigger:** GitHub Action `.github/workflows/call-cockpit.yml` läuft
   werktags 05:00 UTC und ist manuell auslösbar. Benötigte Repo-Secrets:
   `DEALS_SOURCE`, `BREVO_API_KEY`, `TEAMS_WEBHOOK_URL`, `CONTACT_UID_PEPPER`.

## Roadmap (Wert-zuerst, §11)

1. Brevo-Adapter + Spine ✅ → 2. **Call-Cockpit** ✅ (live-fähig: Brevo-REST +
Teams-Webhook + Tages-Trigger) → 3. Lead-Router → 4. Webinar-Orchestrator →
5. Pipeline-Sync + KAM → 6. Conversion-Analyst (Pacing) → 7. PostHog-Stitching →
8. Closed-Loop-Copy.
