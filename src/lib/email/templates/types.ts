/**
 * Template definition model. Every template has a unique id, a category,
 * a transactional/marketing kind, a sender identity, localized subjects and
 * block-based bodies (HTML + plain text are derived from the same blocks).
 */

import type { SenderKey } from "../config";
import type { EmailBlock } from "../layout";
import { esc, strong } from "../layout";

export type TemplateCategory =
  | "authentication"
  | "security"
  | "account"
  | "product"
  | "billing"
  | "marketing"
  | "legal"
  | "support";

export type TemplateKind = "transactional" | "marketing";

export type TemplateVars = Record<string, string | number | undefined>;

export type Localized<T> = { en: T; de?: T; ar?: T };

export type TemplateBody = (vars: TemplateVars) => EmailBlock[];

export type TemplateDef = {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  kind: TemplateKind;
  sender: SenderKey;
  subject: Localized<string>;
  preheader: Localized<string>;
  body: Localized<TemplateBody>;
  /** Documented template variables (for admin UI + validation). */
  vars: string[];
};

/** Display-name fallback used across templates. */
export function nm(vars: TemplateVars): string {
  const raw = String(vars.name ?? vars.firstName ?? "").trim();
  return raw || "there";
}

export function greeting(vars: TemplateVars): string {
  return `Hi ${esc(nm(vars))},`;
}

export function greetingDe(vars: TemplateVars): string {
  return `Hi ${esc(nm(vars))},`;
}

/** Meta-row helper: label + escaped value. */
export function row(
  k: string,
  v: string | number | undefined | null,
): { k: string; v: string } {
  return { k, v: esc(v ?? "—") };
}

export { esc, strong };
