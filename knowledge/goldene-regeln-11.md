# Goldene Regeln: Texting-Niemals (Quelle: Projekt-Brief Section 6)

Diese Regeln sind verbindlich fuer jede Copy und jeden Gespraechsaufhaenger.
Sie sind als ausfuehrbarer Lint im Skill `texting-guardrails` kodiert
(`lib/texting/guardrails.ts`).

1. **Kein "ROI / Amortisation / Sparen".** Kaemmerei-Anti-Vokabular.
   Stattdessen: "Foerdermittel mitnehmen, Eigenanteil senken, Pflichtaufgabe
   ohne neuen Stellenbedarf".
2. **Kein FOMO / "nur noch 3 Plaetze".** Das 20er-Webinar-Limit ist echte
   Kapazitaet, kein Knappheits-Trick.
3. **Keine Klima-only-Sprache.** Bauamt ist ~30 % -> Substanzerhalt /
   Sanierungspriorisierung statt Klimaziel ansprechen.
4. **Grossstadt-Cases nicht zuerst.** ICP sind Kommunen 10.000-50.000 EW.
5. **Foerderung als Risikominderung framen, nicht als Bonus.**
6. **Konkrete Deliverables statt "Beratung".**
   (Wirtschaftlichkeitsberechnung, gremienfaehige Vorlage, Vergabeunterlagen.)
7. **Trigger-Reihenfolge einhalten:** Pflicht-Bindung -> Frist -> Konsequenz
   -> Foerderhebel -> Klima (Bonus).

> Diese Regeln werden vom Cockpit automatisch geprueft: jeder generierte
> Aufhaenger muss `lint()` ohne Verstoss passieren (Test: `test/guardrails.test.ts`).
