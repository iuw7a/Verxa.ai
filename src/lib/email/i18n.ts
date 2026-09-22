/**
 * Localization-ready email strings.
 *
 * Templates resolve content per locale with an English fallback, so a
 * template can ship `en` today and gain `de`/`ar` later without code
 * changes. Arabic uses RTL layout (see layout.ts).
 * No AI translation at send time — all strings are static tables.
 */

export type EmailLocale = "en" | "de" | "ar";

export const EMAIL_LOCALES: EmailLocale[] = ["en", "de", "ar"];

export function isRtl(locale: EmailLocale): boolean {
  return locale === "ar";
}

export function resolveLocale(input?: string | null): EmailLocale {
  const v = (input ?? "").trim().toLowerCase().slice(0, 2);
  if (v === "de") return "de";
  if (v === "ar") return "ar";
  return "en";
}

type ChromeStrings = {
  tagline: string;
  support: string;
  privacy: string;
  terms: string;
  account: string;
  settings: string;
  unsubscribe: string;
  unsubscribeNote: string;
  securityNote: string;
  allRights: string;
  viewInBrowser?: string;
};

export const CHROME: Record<EmailLocale, ChromeStrings> = {
  en: {
    tagline: "Chat at the speed of AI",
    support: "Support",
    privacy: "Privacy",
    terms: "Terms",
    account: "Account",
    settings: "Settings",
    unsubscribe: "Unsubscribe",
    unsubscribeNote:
      "You received this because you subscribed to Verxa updates. Unsubscribe anytime — security and account emails will continue.",
    securityNote:
      "Security notice: Verxa will never ask for your password by email. If you didn't trigger this, secure your account right away.",
    allRights: "Verxa AI · verxa.de",
  },
  de: {
    tagline: "Chatten in KI-Geschwindigkeit",
    support: "Support",
    privacy: "Datenschutz",
    terms: "AGB",
    account: "Konto",
    settings: "Einstellungen",
    unsubscribe: "Abmelden",
    unsubscribeNote:
      "Du erhältst dies, weil du Verxa-Updates abonniert hast. Jederzeit abmeldbar — Sicherheits- und Konto-E-Mails bleiben aktiv.",
    securityNote:
      "Sicherheitshinweis: Verxa fragt niemals per E-Mail nach deinem Passwort. Wenn du das nicht warst, sichere dein Konto sofort.",
    allRights: "Verxa AI · verxa.de",
  },
  ar: {
    tagline: "دردشة بسرعة الذكاء الاصطناعي",
    support: "الدعم",
    privacy: "الخصوصية",
    terms: "الشروط",
    account: "الحساب",
    settings: "الإعدادات",
    unsubscribe: "إلغاء الاشتراك",
    unsubscribeNote:
      "استلمت هذه الرسالة لأنك مشترك في تحديثات Verxa. يمكنك إلغاء الاشتراك في أي وقت — ستبقى رسائل الأمان والحساب فعّالة.",
    securityNote:
      "تنبيه أمني: لن تطلب Verxa كلمة مرورك عبر البريد الإلكتروني أبدًا. إذا لم تكن أنت، أمّن حسابك فورًا.",
    allRights: "Verxa AI · verxa.de",
  },
};

export type CommonStrings = {
  hello: string;
  hiName: string;
  ignoreIfNotYou: string;
  needHelp: string;
  replyReachesHuman: string;
  openApp: string;
  reviewSecurity: string;
  managePreferences: string;
  expiresNote: string;
};

const COMMON_EN: CommonStrings = {
  hello: "Hello",
  hiName: "Hi {{name}}",
  ignoreIfNotYou: "If this wasn't you, you can safely ignore this email.",
  needHelp: "Need help? Just reply — it reaches a human.",
  replyReachesHuman: "Reply to this email — it reaches a human.",
  openApp: "Open Verxa",
  reviewSecurity: "Review security",
  managePreferences: "Manage email preferences",
  expiresNote: "This link expires soon and can only be used once.",
};

export const COMMON: Record<EmailLocale, CommonStrings> = {
  en: COMMON_EN,
  de: {
    hello: "Hallo",
    hiName: "Hi {{name}}",
    ignoreIfNotYou:
      "Wenn du das nicht warst, kannst du diese E-Mail einfach ignorieren.",
    needHelp: "Brauchst du Hilfe? Antworte einfach — es liest ein Mensch.",
    replyReachesHuman: "Antworte auf diese E-Mail — es liest ein Mensch.",
    openApp: "Verxa öffnen",
    reviewSecurity: "Sicherheit prüfen",
    managePreferences: "E-Mail-Einstellungen verwalten",
    expiresNote: "Dieser Link läuft bald ab und kann nur einmal verwendet werden.",
  },
  ar: {
    hello: "مرحبًا",
    hiName: "مرحبًا {{name}}",
    ignoreIfNotYou: "إذا لم تكن أنت، يمكنك تجاهل هذه الرسالة بأمان.",
    needHelp: "تحتاج مساعدة؟ ردّ على الرسالة — سيقرأها إنسان.",
    replyReachesHuman: "ردّ على هذه الرسالة — سيقرأها إنسان.",
    openApp: "افتح Verxa",
    reviewSecurity: "مراجعة الأمان",
    managePreferences: "إدارة تفضيلات البريد",
    expiresNote: "ينتهي هذا الرابط قريبًا ولا يمكن استخدامه إلا مرة واحدة.",
  },
};

/** Tiny `{{var}}` interpolator for static strings. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (m, k) =>
    vars[k] !== undefined ? vars[k] : m,
  );
}
