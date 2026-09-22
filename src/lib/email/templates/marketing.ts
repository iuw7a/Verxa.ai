/** Marketing templates — always consent-gated + List-Unsubscribe. */
import { APP_URL } from "../config";
import { greeting, strong, type TemplateDef } from "./types";

function marketingBase(
  id: string,
  name: string,
  description: string,
  subjectEn: string,
  subjectDe: string,
  heading: string,
  sender: TemplateDef["sender"] = "updates",
): TemplateDef {
  return {
    id,
    name,
    description,
    category: "product",
    kind: "marketing",
    sender,
    subject: { en: subjectEn, de: subjectDe },
    preheader: { en: description, de: description },
    body: {
      en: (v) => [
        { type: "h", text: heading.replace("{{featureName}}", String(v.featureName ?? "")) },
        ...(v.message
          ? [{ type: "p" as const, text: String(v.message) }]
          : [{ type: "p" as const, text: `${greeting(v)} here's what's new at Verxa.` }]),
        { type: "btn", label: "Open Verxa", href: `${APP_URL}/chat` },
      ],
    },
    vars: ["name", "email", "featureName", "message"],
  };
}

export const MARKETING_TEMPLATES: TemplateDef[] = [
  marketingBase("marketing-announcement", "Product announcement", "A big product announcement from Verxa.", "Big news from Verxa ✦", "Große Neuigkeiten von Verxa ✦", "Something big just landed"),
  marketingBase("marketing-feature", "New feature announcement", "Announce a shipped feature.", "New in Verxa: {{featureName}}", "Neu bei Verxa: {{featureName}}", "New: {{featureName}}"),
  {
    id: "marketing-newsletter",
    name: "Verxa newsletter",
    description: "The regular newsletter edition.",
    category: "product",
    kind: "marketing",
    sender: "updates",
    subject: { en: "Verxa newsletter — {{featureName}}", de: "Verxa-Newsletter — {{featureName}}" },
    preheader: { en: "This month at Verxa.", de: "Diesen Monat bei Verxa." },
    body: {
      en: (v) => [
        { type: "h", text: `Verxa newsletter` },
        ...(v.message
          ? [{ type: "p" as const, text: String(v.message) }]
          : [{ type: "p" as const, text: `${greeting(v)} here's what happened at Verxa this month.` }]),
        { type: "btn", label: "Open Verxa", href: `${APP_URL}/chat` },
      ],
    },
    vars: ["name", "email", "featureName", "message"],
  },
  marketingBase("marketing-updates", "Product updates", "Roundup of recent improvements.", "What improved at Verxa", "Was sich bei Verxa verbessert hat", "Fresh improvements"),
  marketingBase("marketing-tips", "Tips and tutorials", "Get more out of Verxa.", "Verxa tip: {{featureName}}", "Verxa-Tipp: {{featureName}}", "Tip: {{featureName}}"),
  marketingBase("marketing-integrations", "New integrations", "Connect more of your workflow.", "New integration: {{featureName}}", "Neue Integration: {{featureName}}", "New integration: {{featureName}}"),
  marketingBase("marketing-models", "New models / features", "New AI models available.", "New models on Verxa", "Neue Modelle bei Verxa", "Fresh models just dropped"),
  marketingBase("marketing-special", "Special announcement", "One-off special news.", "A special note from Verxa", "Eine besondere Nachricht von Verxa", "A special note"),
  marketingBase("marketing-community", "Community announcement", "Community news and highlights.", "From the Verxa community", "Aus der Verxa-Community", "Community highlights"),
  {
    id: "marketing-reengagement",
    name: "Re-engagement email",
    description: "Win back inactive users.",
    category: "product",
    kind: "marketing",
    sender: "hello",
    subject: { en: "We miss you — Verxa got better", de: "Wir vermissen dich — Verxa ist besser geworden" },
    preheader: { en: "Come see what's new.", de: "Schau dir an, was neu ist." },
    body: {
      en: (v) => [
        { type: "h", text: `Long time, ${strong(v.name ?? "there")}` },
        { type: "p", text: `${greeting(v)} Verxa improved a lot since your last visit — new models, faster answers, image and video generation.` },
        { type: "btn", label: "Come back", href: `${APP_URL}/chat` },
        { type: "p", text: "Don't want these? Unsubscribe below — your account stays untouched." },
      ],
    },
    vars: ["name", "email"],
  },
  {
    id: "marketing-recommendation",
    name: "Personalized product recommendation",
    description: "Suggest something based on usage.",
    category: "product",
    kind: "marketing",
    sender: "updates",
    subject: { en: "Picked for you: {{featureName}}", de: "Für dich: {{featureName}}" },
    preheader: { en: "Based on how you use Verxa.", de: "Basierend auf deiner Nutzung." },
    body: {
      en: (v) => [
        { type: "h", text: `Try ${strong(v.featureName ?? "")}` },
        { type: "p", text: `${greeting(v)} based on how you use Verxa, we think you'll like this.` },
        ...(v.message ? [{ type: "p" as const, text: String(v.message) }] : []),
        { type: "btn", label: "Try it", href: `${APP_URL}/chat` },
      ],
    },
    vars: ["name", "email", "featureName", "message"],
  },
  {
    id: "marketing-campaign",
    name: "Marketing campaign template",
    description: "Generic campaign with custom copy.",
    category: "product",
    kind: "marketing",
    sender: "updates",
    subject: { en: "{{featureName}}", de: "{{featureName}}" },
    preheader: { en: "News from Verxa.", de: "Neuigkeiten von Verxa." },
    body: {
      en: (v) => [
        { type: "h", text: String(v.featureName ?? "News from Verxa") },
        ...(v.message ? [{ type: "p" as const, text: String(v.message) }] : []),
        { type: "btn", label: "Open Verxa", href: `${APP_URL}/chat` },
      ],
    },
    vars: ["name", "email", "featureName", "message"],
  },
];
