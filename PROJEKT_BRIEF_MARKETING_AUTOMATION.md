# Projekt-Brief: Marketing- & Sales-Automation „Effizienzpioniere Kommunen"

> **An Claude (neuer Chat / neues Repo):** Dieses Dokument ist ein vollständiger, eigenständiger Auftrag. Es enthält alle Fakten, IDs, Zahlen und Entscheidungen, um ein **eigenes Repository** für die Marketing-/Sales-Automation aufzubauen. Du hast keinen Zugriff auf die Quell-Repos — alles Nötige steht hier. Lies erst komplett, dann schlage Repo-Struktur + erste Iteration vor (Abschnitt 10/11). Sprache: Deutsch. Stack-Vorschlag steht unten, ist aber diskutierbar.

**Auftraggeber:** Effizienzpioniere GmbH, Stuttgart — Energieberatung für Kommunen (Sanierung, Förderung, Klima-/Energiepflichten). Kontakt: jonas.hofheinz@effizienzpioniere.de.
**Stand:** 2026-05-30.

---

## 1 · Ziel des Projekts (in einem Satz)

Eine Closed-Loop-Automation im Claude-Ökosystem, die den langen Kommunen-Sales-Funnel **end-to-end identitätsbasiert verkettet** (anonymer Besuch → Brevo-Kontakt → Webinar → Anruf → Termin → Angebot → Beauftragung → Umsatz) und als **erstes konkretes Artefakt** ein **Call-Cockpit** liefert: eine tägliche, priorisierte Anruf-Worklist für den Vertrieb, gepusht als **Microsoft-Teams-Tagesnachricht**.

**Engpass-These (validiert):** Das Problem ist nicht Lead-Gen, sondern (a) durchrutschende Follow-up-Anrufe und (b) begrenzte Lieferkapazität. Die Automation schützt die tägliche Anruf-Aktivität und die €-/Kapazitäts-Priorisierung.

---

## 2 · System-Inventar (Marketing-/Sales-Stack mit echten IDs)

| System | Rolle | Region | Konkrete Identifikatoren | Status |
|---|---|---|---|---|
| **Brevo** (Sendinblue SAS) | CRM-of-record: Contacts + **Deals-Pipeline** (620 Deals), Newsletter, Kampagnen; ~3.000 Kommunalkontakte (BW+BY, geclustert nach Bundesland/Größenklasse/Branche) | EU (FR) | Web-SDK-Client-Key `l3jghjq2k3x8am3tze8nff3f`; Track-Event `newsletter_intent {source:'webinare'}`; SDK-Loader `cdn.brevo.com/js/sdk-loader.js` | Web-SDK live; Server-API/Deals via REST geplant |
| **LUMA (lu.ma)** | Webinar-Funnel: Anmeldung, Kapazität **20 Plätze**, mehrfach/Woche parallel BW+BY | US | Kalender `luma.com/effizienzpioniere?tag=Kommunen`; Cover-CDN `images.lumacdn.com`; Tags `Kommunen/Förderung/Klima` | Live (extern) |
| **Outlook Bookings** (M365) | Terminbuchung „Expertengespräch" (30 Min, kostenfrei) — primärer Conversion-CTA | EU | `https://outlook.office.com/book/BuchungDanielSchfers@effizienzpioniere.de/s/tLEvRsaxNEqePM70_IbX5A2?ismsaljsauthenabled` | Live |
| **usebasin** | Form-Backend des Website-Kontaktformulars | — | POST `https://usebasin.com/f/2c3b9d3c0bd7`; Honeypot `_gotcha` | Live |
| **PostHog (EU)** | Reichweiten-/Conversion-Tracking, cookieless | EU (Frankfurt, `eu.i.posthog.com`) | Key via ENV `POSTHOG_KEY`; Browser-API `window.epAnalytics.track(event, props)`; nur `utm_*`+`ref` werden durchgelassen | Code live, Key-Aktivierung offen |
| **Microsoft 365** | Teams (Delivery der Tagesnachricht), Outlook Mail/Kalender, SharePoint | EU | — | **MCP-Server bereits verfügbar** (Outlook/Teams/SharePoint/Kalender) |

**Personen:** Jonas Hofheinz (Mitgründer, Webinar-Host BW; +49 711 34067857). Daniel Schäfers (Vertrieb/Erstgespräch, treibt Bayern; +49 711 34067858; daniel.schaefers@effizienzpioniere.de). Matthias (Lieferung). +1 EEE-Hire ab Juli 2026.

---

## 3 · Funnel — ZWEI Geografie-Archetypen (wichtig!)

Der Funnel ist **nicht** uniform. Er teilt sich nach Bundesland/Rolle:

| | **BW — Webinar-Inbound (Jonas)** | **BY — Proaktiv-Call (Daniel)** |
|---|---|---|
| Mechanik | warmes Webinar → **direkte Buchung/Beauftragung**, **Anrufebene übersprungen** | Webinar/Brevo-Kontakt → **halbwarme Anruf-Kaskade** → Termin → … |
| Reife | etabliert, läuft „quasi automatisch" | initiales Fußfassen, geringe Bekanntheit → mehr Volumen nötig |
| Engpass | Webinar-Reichweite + Buchungs-Reibung + Lieferkapazität | **Sales-Anruf-Takt (Tagesquote)** + Lieferkapazität |
| Automation | Flywheel füllen + reibungslose Buchung + leichter Nurture — **keine Anrufliste** | **Call-Cockpit (das erste Artefakt!)** |

**Kein vorab gesetzter BW/BY-€-Split** (nicht belastbar abschätzbar) → beide getrennt messen, Split aus Ist lesen.

### Quantifizierter BY-Anruf-Funnel (Soll, pro Monat)

| # | Stage | → Conv. | /Monat | Aktivitäts-Quote |
|---|---|---|---|---|
| 1 | Deal aus Webinar (anzurufen) | ×1/3 | 96 | — |
| 2 | Halbwarmer Anruf m. Ansprechpartner geführt | ×3/4 | 32 | **min. 2 Anrufe/Tag** |
| 3 | Verkaufsgespräch (Teams + Slidedeck) | ×1/2 | 24 | **min. 1 Gespräch/Tag** |
| 4 | Datenabfrage versendet (Excel Kunden-/Gebäudeinfos) | ×1/3 | 12 | — |
| 5 | Daten erhalten | → Angebot | 4 | — |
| 6 | Angebot versendet | ×~1/2 (~50 %) | ~4 | — |
| 7 | Pakete beauftragt (= Won) | — | ~2 | — |

Kette 96→32→24→12→4→~2. **Wartepunkt-Drop:** Schritt 4→5 (Excel-Rücklauf) ist Haupt-Stau (s. Ist unten).

---

## 4 · Reale Brevo-Pipeline „Kommunen" (Ist, CRM-of-record)

620 Deals, Owner Daniel/Jonas. Jede Karte: Kontakt(e) + „Letzte Aktivität: Vor X Tagen/Monaten" + Next-Action-Chip (Call/Meeting/Todo/Email) + Fälligkeit (oft „X Tage überfällig").

| Stage | Deals | € | Funnel-Bezug |
|---|---|---|---|
| ALT | 16 | 0 | Altbestand |
| **Neu / Webinarteilnahme** | **230** | 86.000 | Stage 1 (Webinar-Zufluss-Backlog) |
| Versucht zu erreichen | 50 | 0 | Stage 2 (nicht erreicht) |
| Im Gespräch / Mailkontakt | 62 | 0 | Stage 2 aktiv |
| Gesprächstermin vereinbart | 9 | 20.520 | Stage 3 |
| Später / Warten | 16 | 50.000 | Park |
| **Daten angefragt** | **62** | 0 | Stage 4 |
| **Daten erhalten** | **0** | 0 | Stage 5 ← **Stau sichtbar** |
| **Angebot versendet** | **8** | 79.730 | Stage 6 |
| **Won** | 2 | 46.488 | Stage 7 |
| Lost | 165 | 37.645 | verloren |

**Drei operative Befunde (das adressiert das Cockpit):**
1. **Zwei Anruf-Queues:** (a) **Close-Queue — offene Angebote nachtelefonieren** (`Angebot versendet`, €-Betrag bekannt, ~50 % Conv. → **höchste Priorität**); (b) **Reach-out-Queue** (`Neu/Webinarteilnahme → Versucht zu erreichen → Im Gespräch`).
2. **Wartepunkt:** 62 „Daten angefragt" / 0 „Daten erhalten" → Reminder-/Chase-Automation am Excel-Rücklauf.
3. **Durchrutschende Follow-ups:** viele Karten 44/78/82 Tage überfällig → tägliche Worklist (überfällig + heute fällig zuerst).

**Hinweis:** Brevo bewirbt im Board „Smart Sequences" (eigener AI-Assistant). Koexistenz möglich, aber er liefert nicht die §11-Aufhänger / €-/Kapazitäts-Priorisierung / Archetyp-Weiche → das Claude-Cockpit sitzt darüber.

---

## 5 · Zielsystem 2026 (Team-Jahresplanung — kanonisch)

**2025 Ist:** 217 Projekte, **€641.597**. Ø: BAFA €7.445 (48), GEKO €1.486 (141), iSFP €2.537 (8).
**2026 Ziel:** Ziellinie **€1.028.100** (Top-Down) bzw. ~**€1,16 Mio** (Bottom-Up); +~60 % YoY. Monats-Sales-Plan €71.953 (Jan) → €119.177 (Dez).

| Produktlinie | Ø €/Stk | Menge/Monat | € 2026 | Haupthebel | Liefer-Kapazität |
|---|---|---|---|---|---|
| **BAFA** (NWG-Bericht) | 7.445 | 5→6→8→10 | 655.147 | Geschwindigkeit | **3,5 Berichte/FTE/Monat** |
| **GEKO** (Gebäudekompass, mit Vor-Ort) | 1.486 | 20 | 356.740 | Aufträge | **2 Berichte/Produktivtag** |
| **GEKO light** (ohne Vor-Ort) | 600 | — | — | Volumen-Variante | keine Vor-Ort-Last |
| **Zusatz** (z.B. BEW) | ~10.000 | ab April | 90.000 | Aufträge, Know-How | 0,375 FTE |
| **Neu** (z.B. kommunale Netze) | ~10.000 | 5.000/Mon | 60.000 | Aufträge, Know-How, Zeit | 0,4 FTE |

**Kapazität ist expliziter Plan-Treiber (zweiter Engpass):** Gesamt-FTE 3,9 (2025) → 4,7 (H1) → 5,7 (H2, +1 EEE ab Juli). **BAFA-Stückzahl folgt der FTE-Kapazität, nicht der Nachfrage** → Umsatzplan = Funnel-Zufluss gedeckelt durch Lieferkapazität.

**„Paket" ist KEIN KPI** — die Planung rechnet in **€ je Produktlinie + Stückzahl + FTE**. (Sales-Sprachbild: 1 „Paket" ≈ €36–42k, „typische volle Beauftragung".)

**Zwei Umsatz-Motionen:** (1) Neu-Logo (Funnel oben), (2) **Key-Account-Management / Folgeaufträge** (neue Rolle 2026: Bestandskunden „über die ganze Strecke" begleiten, Folgeaufträge, eigene Pipeline + NRR-KPI).

**Qualitative Ziele 2026:** DIE Energieberatung für Kommunen in BW · Bekanntheit in Bayern aufbauen · Portfolio „Durchstich" (kommunale Netze) · KAM etablieren · „eine Hand voll" Kommunen bis Umsetzung begleiten.

---

## 6 · Persona & Texting-Guardrails (für Anruf-Aufhänger & Copy)

**ICP:** Kommunen **10.000–50.000 EW**, faktisch **BW + Bayern**, >10 Bestandskunden.

| Persona | Anteil | Trigger-Sprache | Beweis-Sprache |
|---|---|---|---|
| Klima-/Energiemanager:in | ~60 % | KWP, EnEfG, Klimaneutralität, CO₂-Bilanz, Förderquote | abgerufene Fördermittel, CO₂-Reduktion, gesparte Stunden |
| Bauamt | ~30 %, wachsend | GEG, GModG, Sanierungsfahrplan, Substanzerhalt | Substanzerhalt, Sanierungspriorisierung (**nicht** Klimaziel) |
| Bürgermeister:in | klein | Pflicht-Frist, politisches Risiko | Peer-Kommunen, Presse-fähige Cases |
| Kämmerei | mitentscheidend | Förderquote, Eigenanteil, Fördermitnahme, AfA | konkrete Eigenanteils-Zahlen |

**Trigger-Reihenfolge:** Pflicht-Bindung → Frist → Konsequenz → Förderhebel → Klima (Bonus). **Top-Einwand:** „Kein Budget/Personal" → Fördermittel-Begleitung inkl., Eigenanteil ≤ X %.

**Texting-Niemals (Auswahl):** kein „ROI/Amortisation/Sparen" (Kämmerei-Anti-Vokabular → „Fördermittel mitnehmen, Eigenanteil senken, Pflichtaufgabe ohne neuen Stellenbedarf"); kein FOMO/„nur noch 3 Plätze" (20er-Webinar-Limit ist echte Kapazität); keine Klima-only-Sprache (Bauamt 30 %); Großstadt-Cases nicht zuerst; Förderung als Risikominderung framen, nicht als Bonus; konkrete Deliverables statt „Beratung" (beschlussreife Wirtschaftlichkeitsberechnung, gremienfähige Vorlage, Vergabeunterlagen UVgO/VOB). → **Diese Regeln als wiederverwendbares Skill kapseln**, damit jeder Copy-/Aufhänger-Agent sie erbt.

---

## 7 · Conversion-Tracking & KPI-Modell

**Identitäts-Spine:** Join aller Systeme auf `contact_uid = sha256(lower(email) + PEPPER)` (Pepper aus Azure Key Vault). Brevo = CRM-of-record; PostHog = anonymes Online-Vorleben; LUMA/Outlook/usebasin = Funnel-Events. Claude reichert an: Kommune→Bundesland/Größenklasse/ICP-Fit, Funktion-Freitext→Persona, Dedup/Merge.

| Schicht | Signal | Event/Quelle |
|---|---|---|
| Lagging | Termin gebucht / Angebot angenommen | Outlook-Bookings / Brevo-Deal Won + € |
| Lagging | Formular | usebasin-POST / `form_submit` |
| Leading | Webinar-CTA-Klick, `newsletter_intent`, FAQ-Scroll, Case-Verweildauer | Brevo (live) / PostHog |

**Attribution multi-touch** (Funnel 6–12 Wo. + ~6 Mon. bis Umsatz): First-Touch (UTM) · Engagement-Touch (Webinar/Newsletter) · Closing-Touch (Booking). **Zwei Uhren:** Abschluss = Lagging (vor ~6 Mon. bestimmt) vs. Aktivitäts-Pace heute = Leading. **Tracking in € + Produktlinie + Ticket-Stückzahl** (Stückzahl = Kapazitätsdimension, nicht Umsatz).

---

## 8 · Datenfelder (für Spine & Lead-Routing)

- **Kontaktformular (usebasin):** `name` (req), `funktion` (opt, z.B. „Bauamtsleiter"), `kommune` (req), `email` (req), `nachricht` (opt), `_gotcha` (Honeypot).
- **LUMA-Registrierungsfragen:** Anrede (req), „Für welche Kommune arbeiten Sie?" (req), „In welcher Funktion arbeiten Sie?" (req).
- **LUMA-Event-Felder:** id, name, description, start_at/end_at, duration_interval, url, cover_url, meeting_url/zoom_meeting_url, tags, geo_*, timezone, visibility, registration_questions. Site-Filter: Tag `Kommunen` + future, Top-5.
- **Brevo-Deal (Soll-Felder je Deal):** stage (s. §4), owner, kommune, bundesland, persona, `revenue_eur`, produktlinie, `n_bafa/n_geko/n_geko_light`, next_action, due_date, last_activity, consent_state.

---

## 9 · Datenschutz-Gating (Annahme: AVV + Cookie-Consent werden nachgezogen)

`consent_state ∈ {none, aggregate, identified}`. PostHog Phase 1 = cookieless (`persistence:'memory'`, `person_profiles:'never'`, `autocapture:false`, `respect_dnt:true`, IP verworfen) → kein TTDSG-§25-Fall. Identity-Stitching mit PostHog erst nach Consent. Brevo/LUMA/Outlook/usebasin sind kein §25-Fall (Nutzer übergibt E-Mail aktiv) → Spine + Cockpit dürfen darauf vor Consent bauen. Reihenfolge: (1) AVV Brevo → Server-API/Deals, (2) Consent-Banner → PostHog identified, (3) AVV/SCC LUMA (US). Design degradiert sauber auf Aggregat, wenn Consent fehlt.

---

## 10 · Erstes Artefakt: Call-Cockpit (Definition of Done)

**Was:** Agent, der täglich die Brevo-Deals-Pipeline liest und für **Daniel (Bayern, Archetyp BY)** eine priorisierte Worklist als **Teams-Tagesnachricht** postet.

**Priorisierungs-Logik (in dieser Reihenfolge):**
1. **Überfällige** Next-Actions zuerst (Brevo `due_date` < heute).
2. **Close-Queue:** offene Angebote (`Angebot versendet`) nachtelefonieren — €-gewichtet (höchster Deal-Betrag zuerst).
3. **Reach-out-Queue:** `Neu/Webinarteilnahme → Versucht zu erreichen → Im Gespräch` — gewichtet nach ICP-Fit + Webinar-Aktualität.
4. **Daten-Chase:** `Daten angefragt` ohne Rücklauf → Reminder-Vorschlag.
5. **Kapazitäts-Hinweis:** bei vollem BAFA-Slot (FTE-Limit) GEKO/GEKO-light-Leads bevorzugen.

**Pro Eintrag in der Nachricht:** Kommune, Kontakt, Stage, Tage seit letzter Aktivität/überfällig, **§11-konformer Gesprächsaufhänger** (Persona-spezifisch, Pflicht-vor-Klima), Deal-€, direkter Brevo-Deal-Link.
**Dazu:** Tagesquote-Status (Ist vs. min. 2 Anrufe / 1 Gespräch).
**Delivery:** Microsoft Teams (über den vorhandenen M365-MCP), 1×/Tag morgens.
**Phase 0:** gegen Mock-/Beispieldaten lauffähig (kein Brevo-AVV nötig), damit es sofort vorführbar ist; Brevo-REST-Anbindung hinter Adapter-Interface.

**Nicht im Scope v1:** BW-Inbound-Automation, Newsletter-Engine, PostHog-Stitching, KAM-Pipeline — kommen später (s. §11).

---

## 11 · Vorgeschlagene Repo-Struktur & Roadmap

**Stack-Vorschlag:** Claude Agent SDK (TypeScript **oder** Python — Team-Präferenz erfragen), Custom-MCP-Server pro externer API (Brevo, LUMA, PostHog) via FastMCP/SDK; M365-MCP existiert. Skill `texting-guardrails` kapselt §6. Trigger: Cron (Tagesnachricht) + Webhooks (usebasin/LUMA/Brevo) für später.

```
/agents        call-cockpit, lead-router, webinar-orchestrator, conversion-analyst, pipeline-sync
/mcp           brevo/  luma/  posthog/         (M365 extern)
/skills        texting-guardrails/  persona-classify/  attribution-model/
/lib           spine/ (contact_uid, anreicherung, dedup)  prioritization/  teams/
/config        plan-2026.yaml (§5 Zahlen)  funnel-soll.yaml (§3)  stages.yaml (§4)
/knowledge     persona-trigger.md (§6)  zielgruppe.md  goldene-regeln-11.md
/test          mock-deals.json (Pipeline-Fixture für Phase 0)
```

**Roadmap (Wert-zuerst):** 1) Brevo-MCP + Spine-Skeleton → 2) **Call-Cockpit (Teams)** → 3) Lead-Router (usebasin/LUMA → Brevo, Archetyp-Weiche) → 4) Webinar-Orchestrator (LUMA-Sync + Einladung/Follow-up) → 5) Pipeline-Sync + KAM-Motion → 6) Conversion-Analyst (Pacing-Dashboard, Ist-vs-Plan §5 + Kapazität) → 7) PostHog-Stitching (nach Consent) → 8) Closed-Loop-Copy-Optimierung.

---

## 12 · Offene Punkte (mit Team klären)

1. **Stack:** TypeScript oder Python für Agent SDK + MCP?
2. **Brevo-API:** API-Key + AVV-Status; exakte Deal-Stage-IDs + Custom-Field-Namen (für `revenue_eur`, produktlinie, bundesland, persona).
3. **Teams-Delivery:** Ziel-Channel/Chat für Daniels Tagesnachricht; Uhrzeit.
4. **Projekt-Explorer:** API/DB/Export für Angebots-Status (geschrieben/angenommen, Datum, Betrag) — Quelle der Money-Stages.
5. **KAM-Motion:** konkrete Folgeauftrags-Stages + Ziel (NRR / Quote je Kommune).
6. **BAFA-Stückumsatz** bestätigt (Ø €7.445) — restliche Produktlinien-Ø ebenfalls (GEKO light €600, Zusatz/Neu ~€10k).
7. **Pepper/Key Vault:** Azure-Zugang für `contact_uid`-Hashing.
</content>
