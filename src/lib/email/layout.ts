/**
 * Email-safe HTML layout + plain-text renderer.
 *
 * Table-based, inline styles only — works in Gmail, Outlook, Apple Mail,
 * iOS/Android mail. Dark Verxa identity (#08080a / #101013) with the
 * product accent (#8ea4ff). Logo is referenced by absolute URL.
 */

import { APP_URL } from "./config";
import { CHROME, isRtl, type EmailLocale } from "./i18n";

/** Escape dynamic values. Template copy itself is trusted static HTML. */
export function esc(value: string | number | undefined | null): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Strong-inline helper for trusted copy with dynamic inserts. */
export function strong(value: string | number | undefined | null): string {
  return `<strong style="color:#f2f2f4;">${esc(value)}</strong>`;
}

export type EmailBlock =
  | { type: "h"; text: string }
  | { type: "p"; text: string }
  | { type: "btn"; label: string; href: string }
  | { type: "box"; text: string }
  | { type: "meta"; rows: { k: string; v: string }[] }
  | { type: "divider" }
  | { type: "note"; text: string };

export type FooterOpts = {
  unsubscribeUrl?: string;
  security?: boolean;
};

const LOGO_URL = `${APP_URL}/verxa-logo.png`;

function renderBlock(b: EmailBlock): string {
  switch (b.type) {
    case "h":
      return `<h2 style="margin:18px 0 10px;font-size:20px;font-weight:600;color:#f2f2f4;letter-spacing:-0.02em;line-height:1.3;">${b.text}</h2>`;
    case "p":
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#a8a8b3;">${b.text}</p>`;
    case "btn":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;"><tr><td align="center" style="background:#8ea4ff;border-radius:10px;"><a href="${b.href}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#0b0b10;text-decoration:none;">${b.label}</a></td></tr></table>`;
    case "box":
      return `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;color:#c9c9d2;">${b.text}</div><div style="height:14px;line-height:14px;">&nbsp;</div>`;
    case "meta":
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;margin:0 0 14px;">` +
        b.rows
          .map(
            (r) =>
              `<tr><td style="padding:9px 16px;font-size:13px;color:#616875;width:38%;vertical-align:top;">${r.k}</td><td style="padding:9px 16px;font-size:13px;color:#e6e7eb;vertical-align:top;">${r.v}</td></tr>`,
          )
          .join("") +
        `</table>`
      );
    case "divider":
      return `<div style="border-top:1px solid rgba(255,255,255,0.07);margin:18px 0;">&nbsp;</div>`;
    case "note":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-left:2px solid #8ea4ff;margin:0 0 14px;"><tr><td style="padding:4px 0 4px 14px;font-size:13.5px;line-height:1.6;color:#9298a5;">${b.text}</td></tr></table>`;
  }
}

export function buildHtml(opts: {
  locale: EmailLocale;
  preheader: string;
  blocks: EmailBlock[];
  footer?: FooterOpts;
}): string {
  const c = CHROME[opts.locale];
  const dir = isRtl(opts.locale) ? "rtl" : "ltr";
  const align = isRtl(opts.locale) ? "right" : "left";
  const inner = opts.blocks.map(renderBlock).join("");

  const unsub = opts.footer?.unsubscribeUrl
    ? `<tr><td style="padding:14px 32px 0;">
        <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#5c5c66;">${esc(c.unsubscribeNote)}</p>
        <a href="${opts.footer.unsubscribeUrl}" style="font-size:12px;color:#8ea4ff;text-decoration:underline;">${esc(c.unsubscribe)}</a>
      </td></tr>`
    : "";
  const sec = opts.footer?.security
    ? `<tr><td style="padding:14px 32px 0;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#5c5c66;">${esc(c.securityNote)}</p>
      </td></tr>`
    : "";

  return `<!doctype html>
<html lang="${opts.locale}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:#08080a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#08080a;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#101013;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
<tr><td style="padding:26px 32px 0;" dir="${dir}" align="${align}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="${align}" style="vertical-align:middle;">
      <img src="${LOGO_URL}" alt="Verxa" width="26" height="26" style="display:inline-block;vertical-align:middle;border:0;" />
      <span style="display:inline-block;vertical-align:middle;margin-left:8px;font-size:18px;font-weight:600;color:#f2f2f4;letter-spacing:-0.02em;">Verxa<span style="color:#8ea4ff;"> AI</span></span>
    </td>
    <td align="right" style="vertical-align:middle;"><span style="font-size:12px;color:#5c5c66;">${esc(c.tagline)}</span></td>
  </tr></table>
</td></tr>
<tr><td style="padding:8px 32px 28px;" dir="${dir}" align="${align}">
  ${inner}
</td></tr>
${unsub}${sec}
<tr><td style="padding:18px 32px;border-top:1px solid rgba(255,255,255,0.07);" dir="${dir}" align="${align}">
  <span style="font-size:12px;line-height:1.7;color:#5c5c66;">
    ${esc(c.allRights)} · <a href="${APP_URL}/support" style="color:#8ea4ff;text-decoration:none;">${esc(c.support)}</a> ·
    <a href="${APP_URL}/privacy" style="color:#8ea4ff;text-decoration:none;">${esc(c.privacy)}</a> ·
    <a href="${APP_URL}/terms" style="color:#8ea4ff;text-decoration:none;">${esc(c.terms)}</a>
  </span>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/tr>|<\/table>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildText(opts: {
  preheader: string;
  blocks: EmailBlock[];
  footer?: FooterOpts;
}): string {
  const parts: string[] = [opts.preheader];
  for (const b of opts.blocks) {
    switch (b.type) {
      case "h":
        parts.push("\n## " + stripHtml(b.text));
        break;
      case "p":
      case "box":
      case "note":
        parts.push(stripHtml(b.text));
        break;
      case "btn":
        parts.push(`${stripHtml(b.label)}: ${b.href}`);
        break;
      case "meta":
        for (const r of b.rows)
          parts.push(`${stripHtml(r.k)}: ${stripHtml(r.v)}`);
        break;
      case "divider":
        parts.push("---");
        break;
    }
  }
  parts.push("\nVerxa AI · verxa.de");
  parts.push("Support: https://verxa.de/support");
  if (opts.footer?.unsubscribeUrl)
    parts.push(`Unsubscribe: ${opts.footer.unsubscribeUrl}`);
  return parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}
