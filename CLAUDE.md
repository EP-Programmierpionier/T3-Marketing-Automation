# CLAUDE.md — Arbeitsanleitung für dieses Repo

Marketing-/Sales-Automation für die Effizienzpioniere (Energieberatung für
Kommunen, BW + Bayern). Dieses Dokument orientiert künftige Claude-Sessions.

## Quellen der Wahrheit (zuerst lesen)

- `PROJEKT_BRIEF_MARKETING_AUTOMATION.md` — der eigenständige Auftrag (Sections §)
- `MARKETING_AUTOMATION_BLUEPRINT.md` — Ziel-Architektur
- `MARKETING_AUTOMATION_CONTEXT.md` — Ist-Inventar
- Bei Widersprüchen gewinnt der Projekt-Brief; Vertriebs-/Texting-Regeln: §6.

Sprache der Artefakte und Commits: **Deutsch**. Code-Kommentare bewusst ohne
echte Umlaute (ae/oe/ue) gehalten, um Encoding-Probleme zu vermeiden.

## Befehle

```bash
npm install
npm test            # Vitest (alle *.test.ts)
npm run typecheck   # strict tsc --noEmit
npm run cockpit       # Call-Cockpit (Teams-Tagesnachricht)        [--today=YYYY-MM-DD]
npm run lead-router   # usebasin/LUMA -> Brevo, Archetyp-Weiche
npm run webinar       # LUMA-Sync + Einladung + Follow-up
npm run pacing        # Conversion-Analyst (Ist vs Plan)
npm run kam           # KAM-Folgeauftrags-KPIs + Worklist
npm run pipeline-sync # Explorer <-> Brevo Money-Stage-Abgleich
npm run copy          # Closed-Loop: Hypothesen + A/B-Newsletter
npm run brevo:check   # PII-freier Brevo-Verbindungs-/Mapping-Test
```

Agenten schreiben Artefakte nach `out/` (gitignored).

## Architektur-Prinzipien

1. **Mock-first hinter Adapter-Interface.** Jede externe Quelle hat ein
   Interface + einen Mock + einen (oft gated) REST-Adapter. Umschalten per ENV:
   - Brevo lesen: `DEALS_SOURCE=mock|brevo` (`mcp/brevo/adapter.ts`)
   - Brevo schreiben: `LEAD_SINK=mock|brevo` (`mcp/brevo/sink.ts`)
   - KAM: `KAM_SOURCE` (`mcp/brevo/kam.ts`)
   - LUMA: `LUMA_SOURCE=mock|luma` (`mcp/luma/adapter.ts`)
   - Explorer: `EXPLORER_SOURCE=mock|explorer` (`mcp/projekt-explorer/adapter.ts`)
   „gated" = der echte Pfad wirft bewusst, bis Feldnamen/AVV/Schnittstelle
   bestätigt sind (offene Punkte §12).
2. **Reine Logik in `lib/`, IO in `agents/` + `mcp/`.** `lib/*`-Funktionen sind
   ohne Netz/IO und damit unit-testbar; die `agents/*/run.ts` orchestrieren und
   schreiben Dateien. Jede `run.ts` exportiert eine reine `build*()`-Funktion
   und führt `main()` nur bei direktem Start aus (`invokedDirectly`).
3. **Config statt Hardcode.** Zahlen/Mappings liegen in `config/*.yaml`, geladen
   über `lib/config.ts` (memoisiert). Neue Config → dort Loader + Interface ergänzen.
4. **Spine teilen.** `lib/spine/` liefert `contact_uid`, Persona-Klassifikation,
   ICP-Fit, Gemeinde-Lookup — von Cockpit, Lead-Router und Webinar genutzt.
5. **Texting-Guardrails sind Pflicht.** Jeder nach außen gehende Text MUSS
   `assertClean()` aus `lib/texting/guardrails.ts` passieren (Pflicht-vor-Klima,
   kein FOMO, kein ROI/Amortisation/Sparen, Bauamt nicht klima-only). Aufhänger
   über `generateOpenerFor()` / Copy über `lib/copy/`. Tests prüfen das.

## Verzeichnis-Layout

```
/agents   call-cockpit · lead-router · webinar-orchestrator · conversion-analyst
          · kam-manager · pipeline-sync · campaign-copywriter   (je run.ts)
/lib      spine/ prioritization/ texting/ teams/ lead-router/ webinar/ pacing/
          kam/ pipeline-sync/ copy/ · config.ts · types.ts · links.ts
/mcp      brevo/ (adapter·rest·mapping·sink·kam) · luma/ · projekt-explorer/
/config   *.yaml (stages, plan-2026, funnel-soll, prioritization, brevo-mapping,
          gemeinden, kam-stages, themen-2026)
/knowledge §6-Regeln, Persona-Trigger, Zielgruppe
/skills   texting-guardrails · persona-classify · attribution-model
/test     *.test.ts + Mock-Fixtures (mock-deals/-luma/-kam/-explorer, sample-leads)
/tools    brevo-check.ts
```

## Einen neuen Agenten hinzufügen

1. Reine Logik unter `lib/<bereich>/` (testbar, kein IO).
2. Externe Quelle als Interface + Mock unter `mcp/<system>/`.
3. `agents/<name>/run.ts`: exportierte `build*()` + `main()`-Guard.
4. `npm`-Script in `package.json`.
5. Tests unter `test/<name>.test.ts` (inkl. Guardrail-Check bei Copy/Aufhängern).
6. README-Abschnitt + Roadmap-Status aktualisieren.

## CI / Git

- CI (`.github/workflows/ci.yml`) läuft `typecheck` + `test` auf Push (main +
  `claude/**`) und PRs. `main` soll grün bleiben.
- Entwicklung auf `claude/<branch>`; via squash-PR nach `main`. Nach Merge den
  Feature-Branch mit `git reset --hard origin/main` + force-with-lease angleichen.
- **Secrets nie committen** (siehe `.env.example`); produktiv via Azure Key Vault.

## Datenschutz-Reihenfolge (wichtig)

Spine/Cockpit dürfen auf E-Mail-übergebende Quellen bauen (Brevo/LUMA/Outlook/
usebasin = kein TTDSG-§25-Fall). **PostHog-Identity-Stitching (Roadmap-Schritt 7)
erst nach Consent-Banner (Phase 2, §9)** — nicht vorziehen. CI lädt bei
`DEALS_SOURCE=brevo` keine `out/`-Artefakte hoch (keine PII in GitHub-Artefakten).

## Roadmap-Status

✅ 1 Brevo+Spine · ✅ 2 Call-Cockpit · ✅ 3 Lead-Router · ✅ 4 Webinar-Orchestrator
· ✅ 5 Pipeline-Sync+KAM · ✅ 6 Conversion-Analyst · ⬜ 7 PostHog (nach Consent)
· ✅ 8 Closed-Loop-Copy

## Offene Punkte für Live-Schaltung (§12, Input vom Team)

1. Brevo-Stage-Labels + Custom-Field-Namen → `config/brevo-mapping.yaml` (§12.2)
2. Teams-`TEAMS_WEBHOOK_URL` + Channel/Uhrzeit (§12.3)
3. Projekt-Explorer-API/Export (§12.4)
4. Consent-Banner → schaltet Schritt 7 frei
