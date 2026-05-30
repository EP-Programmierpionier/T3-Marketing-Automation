# T3 Marketing-Automation — Effizienzpioniere Kommunen

[![CI](https://github.com/EP-Programmierpionier/T3-Marketing-Automation/actions/workflows/ci.yml/badge.svg)](https://github.com/EP-Programmierpionier/T3-Marketing-Automation/actions/workflows/ci.yml)

Closed-Loop Marketing-/Sales-Automation im Claude-Ökosystem für die
Energieberatung für Kommunen (BW + Bayern). **Erstes Artefakt: das
Call-Cockpit** — eine täglich priorisierte Anruf-Worklist für Daniel (Bayern,
Archetyp Proaktiv-Call), gepusht als Microsoft-Teams-Tagesnachricht.

Quellen der Wahrheit: `PROJEKT_BRIEF_MARKETING_AUTOMATION.md`,
`MARKETING_AUTOMATION_BLUEPRINT.md`, `MARKETING_AUTOMATION_CONTEXT.md`.

## Schnellstart (Phase 0, gegen Mock-Daten — kein Brevo-AVV nötig)

```bash
npm install
npm run cockpit          # Call-Cockpit-Tagesnachricht aus test/mock-deals.json
npm run cockpit -- --today=2026-05-30   # mit festem Stichtag (reproduzierbar)
npm run lead-router      # Lead-Router gegen test/sample-leads.json
npm run pacing           # Conversion-Analyst: Pacing-Report (Ist vs Plan)
npm run webinar          # Webinar-Orchestrator: Sync + Einladung + Follow-up
npm run kam              # KAM-Manager: Folgeauftrags-KPIs (NRR) + Worklist
npm run pipeline-sync    # Pipeline-Sync: Explorer <-> Brevo Abgleich
npm run copy             # Campaign-Copywriter: Hypothesen + A/B-Newsletter-Copy
npm test                 # Unit- + Integrationstests (73)
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
/agents/lead-router    run.ts (usebasin/LUMA -> Brevo, Archetyp-Weiche BW/BY)
/agents/conversion-analyst  run.ts (Pacing-Report: Ist vs Plan, zwei Uhren)
/agents/webinar-orchestrator run.ts (LUMA-Sync + Einladung BW/BY + Follow-up)
/agents/kam-manager    run.ts (Folgeauftrags-KPIs + KAM-Worklist)
/agents/pipeline-sync  run.ts (Explorer <-> Brevo Money-Stage-Abgleich)
/agents/campaign-copywriter run.ts (Closed-Loop: Hypothesen + A/B-Copy)
/lib/lead-router       normalize.ts · route.ts · notify.ts · types.ts
/lib/pacing            analyze.ts · report.ts · plan.ts
/lib/webinar           select.ts · invite.ts · followup.ts · types.ts
/lib/kam               metrics.ts · worklist.ts · types.ts
/lib/pipeline-sync     reconcile.ts
/lib/copy              newsletter.ts · hypotheses.ts · types.ts
/lib/links.ts          Booking-URL + UTM-Helfer (geteilt)
/mcp/luma              adapter.ts (Mock + REST-Stub, gated)
/mcp/projekt-explorer  adapter.ts (Mock + REST-Stub, gated §12.4)
/mcp/brevo             adapter.ts (Lese: Mock+REST) · sink.ts (Schreib: Mock+REST) · rest.ts · mapping.ts
/mcp/luma,/mcp/posthog Platzhalter (spätere Roadmap-Schritte)
/skills                texting-guardrails/ · persona-classify/ · attribution-model/
/lib/spine             contact_uid + Anreicherung (Persona, ICP-Fit)
/lib/prioritization    Scoring + Kapazität + Datums-Helfer
/lib/texting           guardrails.ts (Lint) + opener.ts (Aufhänger)
/lib/teams             message.ts (Markdown + Adaptive Card)
/config                plan-2026.yaml · funnel-soll.yaml · stages.yaml · prioritization.yaml · brevo-mapping.yaml · gemeinden.yaml
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
Teams-Webhook + Tages-Trigger) → 3. **Lead-Router** ✅ (usebasin/LUMA → Brevo,
Archetyp-Weiche, mock-first; CRM-Write hinter Sink-Interface) →
4. **Webinar-Orchestrator** ✅ (LUMA-Sync + segmentierte Einladung BW/BY +
Teilnehmer-/No-Show-Follow-up) → 5. **Pipeline-Sync + KAM** ✅ → 6. **Conversion-Analyst** ✅
(Pacing: Ist-vs-Plan €/Produktlinie, Funnel-Drift, FTE-Kapazität, zwei Uhren,
Segmentierung BW/BY + Persona) → 7. PostHog-Stitching ⬜ (hinter Consent, §9) →
8. **Closed-Loop-Copy** ✅ (Campaign-Copywriter: Hypothesen aus Pacing + A/B-Newsletter).

> 7 von 8 Schritten stehen. **Schritt 7 (PostHog-Stitching)** ist bewusst offen —
> er setzt das Consent-Banner (Phase 2, §9) voraus und wird erst danach gebaut.

### Closed-Loop-Copy (Schritt 8)

`npm run copy` schließt den Loop (§3F): leitet aus dem Pacing-Report
**testbare Hypothesen** ab (z. B. Daten-Stau → Reminder-Variante, Pacing < Plan →
Direkt-Termin-CTA) und erzeugt persona-segmentierte **Newsletter-A/B-Varianten**
(`pflicht_first` vs `foerder_first`) zu kuratierten Themen (`config/themen-2026.yaml`).
Alle Texte guardrail-geprüft (kein FOMO/ROI/Sparen, Bauamt nicht klima-only),
Primär-CTA = Outlook-Booking-Link + UTM. Volltexte je Variante in `out/copy-<datum>.json`.
Das Messen der Leading-Signale je Variante folgt mit PostHog/Brevo-Events (Schritt 7).

### Webinar-Orchestrator (Schritt 4)

`npm run webinar` (1) synct kommende Kommunen-Events (Tag `Kommunen` + future +
Top-5), (2) erzeugt **segmentierte Einladungen** (BW: KEA-BW-Förderkulisse / BY:
bayerische Förderkulisse) mit LUMA-Link + UTM, (3) verarbeitet das letzte
vergangene Event: Teilnehmer/No-Show → Archetyp-Weiche → BY-Teilnehmer bekommen
einen „halbwarmen Call"-Task (Cockpit), BW läuft Buchung/Nurture, No-Show bekommt
Aufzeichnung + nächster Termin. Alle Texte guardrail-geprüft (20 Plätze = echte
Kapazität, **kein** FOMO). LUMA hinter `mcp/luma/adapter.ts` (Mock; Phase 1 =
`LUMA_SOURCE=luma`, gated bis API-Key + AVV/SCC wegen US-Transfer, §9).

### Pipeline-Sync + KAM (Schritt 5)

**KAM-Motion** (`npm run kam`, Blueprint §8.2b) — die zweite Umsatz-Motion:
eigene Pipeline (Bestandskunde → Folgebedarf → Folgeangebot → Folgeauftrag) mit
KPIs **NRR** und **Folgeauftrags-Quote** je begleiteter Kommune + priorisierte
KAM-Worklist (überfällig → Folgeangebot € → Folgebedarf nach Account-Wert).

**Pipeline-Sync** (`npm run pipeline-sync`, §3E) — gleicht den Projekt-Explorer
(Money-Stage-Quelle: Angebot geschrieben/angenommen, Datum, Betrag) mit den
Brevo-Deals ab und meldet vier Diskrepanz-Typen (`advance_to_won`,
`amount_mismatch`, `missing_in_brevo`, `missing_in_explorer`) mit Korrektur-
vorschlag — kein Auto-Write in Phase 0. Explorer hinter
`mcp/projekt-explorer/adapter.ts` (Mock; REST gated, §12.4).

### Conversion-Analyst (Schritt 6)

`npm run pacing` liest die gesamte Pipeline und erzeugt einen Markdown-Report
(`out/pacing-<datum>.md` + JSON): **zwei Uhren** (Lagging = Won vs Monatsplan §5;
Leading = überfällige Actions, Reach-out-Backlog, Daten-Stau, Tagesquote,
Kapazitäts-Klippe), **Funnel-Soll-vs-Ist** (BY, §3-Kette), **€ je Produktlinie**
(Ist vs Plan/Monat), **FTE-Kapazität** (BAFA 3,5/FTE, GEKO 2/Tag) und
**Segmentierung** (BW/BY-Split aus Ist + Persona). Won-Monatszuordnung braucht
das Abschluss-Datum (Phase 1, §12.4 Projekt-Explorer).

### Lead-Router (Schritt 3)

usebasin-Form / LUMA-Registrierung → normalisieren (Honeypot-Spamschutz) →
Spine-Anreicherung (Persona, Gemeinde→Bundesland/EW via `config/gemeinden.yaml`,
ICP-Fit) → **Archetyp-Weiche**: BY → Daniel + Call-Cockpit, BW → Jonas
(Webinar-Inbound, keine Anrufliste), unbekannte Geo → „GEO PRÜFEN". Dazu eine
§11-konforme Sales-Benachrichtigung. Schreibseite (`mcp/brevo/sink.ts`) Mock
(Phase 0) bzw. `LEAD_SINK=brevo` (Phase 1, CRM-Write gated bis Feldnamen + AVV
bestätigt). Webhook-Anbindung (usebasin/LUMA) = Live-Schritt.
