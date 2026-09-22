/** Template registry: lookup, metadata for admin UI, localized rendering. */
import { AUTH_TEMPLATES } from "./templates/auth";
import { ACCOUNT_TEMPLATES } from "./templates/account";
import { PRODUCT_TEMPLATES } from "./templates/product";
import { BILLING_TEMPLATES } from "./templates/billing";
import { MARKETING_TEMPLATES } from "./templates/marketing";
import { LEGAL_TEMPLATES, SUPPORT_TEMPLATES } from "./templates/legal-support";
import type { TemplateDef, TemplateVars } from "./templates/types";
import { buildHtml, buildText, type FooterOpts } from "./layout";
import { resolveLocale, type EmailLocale } from "./i18n";

const ALL: TemplateDef[] = [
  ...AUTH_TEMPLATES,
  ...ACCOUNT_TEMPLATES,
  ...PRODUCT_TEMPLATES,
  ...BILLING_TEMPLATES,
  ...MARKETING_TEMPLATES,
  ...LEGAL_TEMPLATES,
  ...SUPPORT_TEMPLATES,
];

const BY_ID = new Map(ALL.map((t) => [t.id, t]));

export function getTemplate(id: string): TemplateDef | undefined {
  return BY_ID.get(id);
}

export function listTemplates(): TemplateDef[] {
  return ALL;
}

/** Safe metadata for the admin UI (no copy, no secrets). */
export function templateMetadata() {
  return ALL.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    kind: t.kind,
    sender: t.sender,
    vars: t.vars,
    locales: Object.keys(t.body),
    subjectEn: t.subject.en,
  }));
}

export function templateStats() {
  const byCategory: Record<string, number> = {};
  const byKind: Record<string, number> = {};
  for (const t of ALL) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
    byKind[t.kind] = (byKind[t.kind] ?? 0) + 1;
  }
  return { total: ALL.length, byCategory, byKind };
}

function pick<T>(loc: { en: T; de?: T; ar?: T }, locale: EmailLocale): T {
  if (locale === "de" && loc.de !== undefined) return loc.de;
  if (locale === "ar" && loc.ar !== undefined) return loc.ar;
  return loc.en;
}

export function renderTemplate(
  def: TemplateDef,
  vars: TemplateVars,
  localeInput?: string | null,
  footer?: FooterOpts,
): { subject: string; html: string; text: string; locale: EmailLocale } {
  const locale = resolveLocale(localeInput);
  const interpolate = (s: string) =>
    s.replace(/\{\{(\w+)\}\}/g, (m, k) => {
      const val = vars[k];
      return val !== undefined && val !== null ? String(val) : m;
    });
  const body = pick(def.body, locale)(vars);
  return {
    subject: interpolate(pick(def.subject, locale)),
    html: buildHtml({
      locale,
      preheader: interpolate(pick(def.preheader, locale)),
      blocks: body,
      footer,
    }),
    text: buildText({
      preheader: interpolate(pick(def.preheader, locale)),
      blocks: body,
      footer,
    }),
    locale,
  };
}
