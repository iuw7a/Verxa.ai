/** Legal + support templates. */
import { APP_URL } from "../config";
import { greeting, strong, type TemplateDef } from "./types";

function legalDoc(
  id: string,
  name: string,
  docName: string,
  docPath: string,
): TemplateDef {
  return {
    id,
    name,
    description: `Notice that ${docName} changed.`,
    category: "legal",
    kind: "transactional",
    sender: "hello",
    subject: {
      en: `We've updated our ${docName}`,
      de: `Wir haben ${docName === "Privacy Policy" ? "unsere Datenschutzrichtlinie" : docName === "Terms of Service" ? "unsere AGB" : "unsere Richtlinie"} aktualisiert`,
    },
    preheader: {
      en: `Please review the updated ${docName}.`,
      de: `Bitte lies die aktualisierte Version.`,
    },
    body: {
      en: (v) => [
        { type: "h", text: `${docName} update` },
        {
          type: "p",
          text: `${greeting(v)} we've updated our ${docName}. ${String(v.message ?? "The changes take effect as stated in the document.")}`,
        },
        { type: "btn", label: `Read the ${docName}`, href: `${APP_URL}${docPath}` },
      ],
    },
    vars: ["name", "email", "message"],
  };
}

export const LEGAL_TEMPLATES: TemplateDef[] = [
  legalDoc("legal-privacy-update", "Privacy policy update", "Privacy Policy", "/privacy"),
  legalDoc("legal-terms-update", "Terms update", "Terms of Service", "/terms"),
  legalDoc("legal-security-policy-update", "Security policy update", "Security Policy", "/privacy"),
  {
    id: "legal-service-policy",
    name: "Important service policy notification",
    description: "Service-critical policy notice.",
    category: "legal",
    kind: "transactional",
    sender: "hello",
    subject: { en: "Important service policy notice", de: "Wichtige Richtlinien-Info" },
    preheader: { en: "Please read — it affects your account.", de: "Bitte lesen — betrifft dein Konto." },
    body: {
      en: (v) => [
        { type: "h", text: "Policy notice" },
        { type: "p", text: greeting(v) },
        ...(v.message ? [{ type: "box" as const, text: String(v.message) }] : []),
      ],
    },
    vars: ["name", "email", "message"],
  },
];

export const SUPPORT_TEMPLATES: TemplateDef[] = [
  {
    id: "support-ticket-created",
    name: "Support ticket created",
    description: "Confirmation after the support form.",
    category: "support",
    kind: "transactional",
    sender: "support",
    subject: { en: "We received your message", de: "Wir haben deine Nachricht erhalten" },
    preheader: { en: "Our team will reply as soon as possible.", de: "Unser Team antwortet schnellstmöglich." },
    body: {
      en: (v) => [
        { type: "h", text: "Ticket received" },
        { type: "p", text: `${greeting(v)} thanks for reaching out — our team will reply as soon as possible.` },
        ...(v.message ? [{ type: "box" as const, text: String(v.message) }] : []),
        { type: "p", text: "Replies will come from support@verxa.de." },
      ],
    },
    vars: ["name", "email", "subject", "message"],
  },
  {
    id: "support-ticket-reply",
    name: "Support ticket reply",
    description: "Admin replied to a ticket.",
    category: "support",
    kind: "transactional",
    sender: "support",
    subject: { en: "New reply from Verxa Support", de: "Neue Antwort vom Verxa-Support" },
    preheader: { en: "The team replied to your ticket.", de: "Das Team hat geantwortet." },
    body: {
      en: (v) => [
        { type: "h", text: "New reply from support" },
        { type: "p", text: `${greeting(v)} the Verxa team replied to your ticket:` },
        ...(v.message ? [{ type: "box" as const, text: String(v.message) }] : []),
        { type: "btn", label: "View conversation", href: `${APP_URL}/support` },
      ],
    },
    vars: ["name", "email", "subject", "message"],
  },
  {
    id: "support-ticket-closed",
    name: "Support ticket closed",
    description: "Ticket resolved/closed.",
    category: "support",
    kind: "transactional",
    sender: "support",
    subject: { en: "Your support ticket was closed", de: "Dein Support-Ticket wurde geschlossen" },
    preheader: { en: "Anything left? Just reply.", de: "Noch etwas offen? Antworte einfach." },
    body: {
      en: (v) => [
        { type: "h", text: "Ticket closed ✓" },
        { type: "p", text: `${greeting(v)} your ticket ${strong(v.note ?? "")} was closed as resolved. If anything is left, just reply to this email to reopen it.` },
      ],
    },
    vars: ["name", "email", "note"],
  },
  {
    id: "support-contact-received",
    name: "Contact form received",
    description: "Generic contact-form confirmation.",
    category: "support",
    kind: "transactional",
    sender: "support",
    subject: { en: "Thanks for contacting Verxa", de: "Danke für deine Nachricht an Verxa" },
    preheader: { en: "We got your message.", de: "Deine Nachricht ist angekommen." },
    body: {
      en: (v) => [
        { type: "h", text: "Message received" },
        { type: "p", text: `${greeting(v)} thanks for contacting Verxa — we'll get back to you shortly.` },
      ],
    },
    vars: ["name", "email"],
  },
  {
    id: "support-feedback-received",
    name: "Feedback received",
    description: "Thanks for product feedback.",
    category: "support",
    kind: "transactional",
    sender: "support",
    subject: { en: "Thanks for your feedback", de: "Danke für dein Feedback" },
    preheader: { en: "It really helps us improve.", de: "Es hilft uns wirklich." },
    body: {
      en: (v) => [
        { type: "h", text: "Feedback received" },
        { type: "p", text: `${greeting(v)} thanks for the feedback — it goes straight to the team building Verxa.` },
      ],
    },
    vars: ["name", "email"],
  },
  {
    id: "support-feedback-response",
    name: "Feedback response",
    description: "Follow-up answer to feedback.",
    category: "support",
    kind: "transactional",
    sender: "support",
    subject: { en: "Following up on your feedback", de: "Rückmeldung zu deinem Feedback" },
    preheader: { en: "Here's what happened next.", de: "So ging es weiter." },
    body: {
      en: (v) => [
        { type: "h", text: "Quick follow-up" },
        { type: "p", text: greeting(v) },
        ...(v.message ? [{ type: "box" as const, text: String(v.message) }] : []),
      ],
    },
    vars: ["name", "email", "message"],
  },
  {
    id: "support-internal-new-ticket",
    name: "Internal: new ticket (to staff)",
    description: "Notify the support inbox about a new ticket. Never sent to users.",
    category: "support",
    kind: "transactional",
    sender: "notifications",
    subject: { en: "New ticket: {{subject}}", de: "Neues Ticket: {{subject}}" },
    preheader: { en: "A user needs help.", de: "Ein Nutzer braucht Hilfe." },
    body: {
      en: (v) => [
        { type: "h", text: "New support ticket" },
        { type: "p", text: `From ${strong(v.email ?? "")} — subject: ${strong(v.subject ?? "")}` },
        ...(v.message ? [{ type: "box" as const, text: String(v.message) }] : []),
        { type: "btn", label: "Open admin", href: `${APP_URL}/admin` },
      ],
    },
    vars: ["email", "subject", "message"],
  },
];
