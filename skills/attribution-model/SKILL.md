---
name: attribution-model
description: >-
  Multi-Touch-Attribution fuer den langen Kommunen-Funnel (6-12 Wochen + ~6
  Monate bis Umsatz): First-Touch (UTM), Engagement-Touch (Webinar/Newsletter),
  Closing-Touch (Booking). TRIGGER: Conversion-Analyst / Pacing-Reporting.
  STATUS: Platzhalter - voll implementiert ab Roadmap-Schritt 6 (Conversion-Analyst).
---

# attribution-model (Platzhalter)

Noch nicht implementiert. Gehoert zum Conversion-Analyst (Blueprint Section 4 + 9
Schicht 2/3). Wird auf der Identitaets-Spine (`contact_uid`) aufsetzen und drei
Touch-Rollen je gewonnenem Deal erfassen:

| Rolle | Quelle |
|---|---|
| First-Touch (Sourcing) | UTM des ersten PostHog-Pageviews / erste Brevo-Aktivitaet |
| Engagement-Touch | LUMA-Attendance, newsletter_intent, Case-Verweildauer |
| Closing-Touch | Outlook-Booking / Direkt-Termin-Link |

Voraussetzung: Consent Phase 2 (PostHog identified) + Brevo-Server-API.
