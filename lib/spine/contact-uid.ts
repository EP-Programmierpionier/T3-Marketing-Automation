// Identitaets-Spine: contact_uid = sha256(lower(email) + PEPPER).
// Quelle: Projekt-Brief Section 7. Pepper produktiv aus Azure Key Vault;
// hier aus ENV (CONTACT_UID_PEPPER) mit Dev-Default.

import { createHash } from "node:crypto";

export function getPepper(): string {
  return process.env.CONTACT_UID_PEPPER ?? "dev-only-pepper-change-me";
}

/**
 * Stabiler, pseudonymer Identifikator ueber alle Systeme hinweg.
 * E-Mail wird normalisiert (trim + lowercase) bevor gehasht wird.
 */
export function contactUid(email: string, pepper: string = getPepper()): string {
  const normalized = email.trim().toLowerCase();
  return createHash("sha256").update(normalized + pepper).digest("hex");
}
