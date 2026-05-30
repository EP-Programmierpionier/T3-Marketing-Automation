// Texting-Guardrails als ausfuehrbarer Lint (Skill `texting-guardrails`).
// Quelle: Projekt-Brief Section 6 + knowledge/goldene-regeln-11.md.
// Jeder generierte Aufhaenger / jede Copy MUSS lint() ohne Verstoss passieren.

export interface GuardrailViolation {
  rule: string;
  match: string;
  hint: string;
}

interface Rule {
  rule: string;
  pattern: RegExp;
  hint: string;
}

// Verbotene Vokabeln/Muster. Bewusst auf Wortgrenzen, um Fehlalarme zu minimieren.
const RULES: Rule[] = [
  {
    rule: "kein-roi-amortisation-sparen",
    // ROI / Amortisation / sparen|Ersparnis (Kaemmerei-Anti-Vokabular).
    pattern: /\b(roi|amortisier\w*|amortisation|sparen|spart|gespart|ersparnis)\b/i,
    hint: "Stattdessen: 'Foerdermittel mitnehmen, Eigenanteil senken, Pflichtaufgabe ohne neuen Stellenbedarf'.",
  },
  {
    rule: "kein-fomo",
    // "nur noch X Plaetze" / FOMO / "letzte Chance". Umlaute als ä oder ae.
    pattern: /(nur noch\s+\d+\s*(freie\s+)?pl(?:ae|[aä])tze|letzte chance|schnell sein|fomo|bevor es zu sp(?:ae|[aä])t)/i,
    hint: "Das 20er-Webinar-Limit ist echte Kapazitaet, kein Knappheits-Trick. Kein FOMO.",
  },
];

export function lint(text: string): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];
  for (const r of RULES) {
    const m = text.match(r.pattern);
    if (m) violations.push({ rule: r.rule, match: m[0], hint: r.hint });
  }
  return violations;
}

/** Wirft, wenn ein Text gegen Guardrails verstoesst. Fuer Generatoren/Tests. */
export function assertClean(text: string, context = "text"): void {
  const v = lint(text);
  if (v.length > 0) {
    const details = v.map((x) => `[${x.rule}] "${x.match}" -> ${x.hint}`).join("; ");
    throw new Error(`Guardrail-Verstoss in ${context}: ${details}`);
  }
}
