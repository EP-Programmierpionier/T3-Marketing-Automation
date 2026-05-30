---
name: persona-classify
description: >-
  Klassifiziert den Funktions-Freitext eines kommunalen Kontakts in eine
  Persona (Klima-/Energiemanager, Bauamt, Buergermeister, Kaemmerei). Basis
  fuer Aufhaenger-Wahl und ICP-Fit. TRIGGER: Lead-Routing, Spine-Anreicherung,
  Cockpit-Aufbereitung.
---

# persona-classify

Regelbasierte Erstklassifikation: `lib/spine/enrich.ts` (`classifyPersona()`).
Deckt die haeufigen Faelle deterministisch ab (Bauamt, Kaemmerei, Buergermeister,
Klima/Energie). Fuer mehrdeutige Freitexte ("Referent Stadtentwicklung") kann ein
LLM-Schritt nachgelagert werden; Default-Fallback ist `klima_energiemanager`
(~60 % der Kontakte, Section 6).

## Persona-Verteilung (Section 6)
- Klima-/Energiemanager:in ~60 %
- Bauamt ~30 % (wachsend)
- Buergermeister:in klein
- Kaemmerei mitentscheidend

Persona steuert in `lib/texting/opener.ts` Hook + Beweis-Sprache und in
`lib/spine/enrich.ts` den ICP-Fit (Persona-Gewicht).
