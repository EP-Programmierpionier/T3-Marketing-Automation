---
name: texting-guardrails
description: >-
  Verbindliche Texting-Regeln fuer alle Copy- und Gespraechsaufhaenger-Agenten
  (Effizienzpioniere Kommunen). Erzwingt Pflicht-vor-Klima, kein FOMO, kein
  Kaemmerei-Anti-Vokabular (ROI/Amortisation/Sparen), persona-getrennte Sprache.
  TRIGGER: immer wenn Aussen-Copy, Anruf-Aufhaenger, Newsletter- oder
  Webinar-Einladungstext fuer Kommunen erzeugt oder geprueft wird.
---

# texting-guardrails

Quelle der Wahrheit: `knowledge/goldene-regeln-11.md` (= GOLDENE_REGELN Section 11)
und `knowledge/persona-trigger.md` (Section 6). Ausfuehrbarer Lint:
`lib/texting/guardrails.ts` (`lint()` / `assertClean()`).

## Nicht-verhandelbare Regeln
1. Kein "ROI / Amortisation / Sparen" -> "Foerdermittel mitnehmen, Eigenanteil
   senken, Pflichtaufgabe ohne neuen Stellenbedarf".
2. Kein FOMO / "nur noch X Plaetze" (20er-Webinar-Limit = echte Kapazitaet).
3. Keine Klima-only-Sprache (Bauamt ~30 %): Substanzerhalt/Sanierungs-
   priorisierung statt Klimaziel.
4. Grossstadt-Cases nicht zuerst (ICP 10.000-50.000 EW).
5. Foerderung als Risikominderung framen, nicht als Bonus.
6. Konkrete Deliverables statt "Beratung".
7. Trigger-Reihenfolge: Pflicht-Bindung -> Frist -> Konsequenz -> Foerderhebel
   -> Klima (Bonus).

## Anwendung
- Vor jeder Ausgabe `assertClean(text)` aufrufen (wirft bei Verstoss).
- Persona-spezifische Hooks/Beweis-Sprache aus `lib/texting/opener.ts` nutzen.
- Bauamt-Persona niemals mit Klima-Primaerargument ansprechen.
