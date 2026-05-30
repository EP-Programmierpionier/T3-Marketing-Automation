# PostHog-MCP (Platzhalter)

Reichweiten-/Conversion-Tracking (EU, Frankfurt). Quelle: Projekt-Brief
Section 2/7/9, Blueprint Section 4/5.

**Status:** noch nicht implementiert. Identity-Stitching erst **nach Consent**
(Phase 2). Vorher cookieless (kein `contact_uid`-Join). Gehoert zu
Roadmap-Schritt 7 (PostHog-Stitching) und dem Conversion-Analyst.

Hinweise:
- Nur `utm_*` + `ref` werden durchgelassen (PII-Schutz).
- Default cookieless: `persistence:'memory'`, `person_profiles:'never'`,
  `autocapture:false`, `respect_dnt:true`, IP verworfen -> kein TTDSG-Section-25-Fall.
- `distinct_id = contact_uid` erst bei `consent_state = identified`.
