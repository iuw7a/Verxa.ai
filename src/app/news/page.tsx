"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Code2,
  Cpu,
  Globe,
  Image as ImageIcon,
  KeyRound,
  Mail,
  Mic,
  MonitorSmartphone,
  Plane,
  Plug,
  Search,
  Sparkles,
  Video,
} from "lucide-react";
import { VerxaMark } from "@/components/brand/verxa-mark";

type NewsItem = {
  icon: React.ReactNode;
  title: string;
  text: string;
  badge: string;
  badgeStyle: string;
};

const sections: { heading: string; sub: string; items: NewsItem[] }[] = [
  {
    heading: "Chat & Modelle",
    sub: "Der Kern von Verxa — fragen, suchen, erstellen.",
    items: [
      {
        icon: <Bot size={17} />,
        title: "Chat mit 40+ Modellen",
        text: "Qwen3 Max / Flash / Omni, Mistral Small & Large, MiniMax M-Serie, GPT-OSS 20B, Nemotron u.v.m. — mit Vision, Tools und schnellem Streaming.",
        badge: "Kern",
        badgeStyle: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100/90",
      },
      {
        icon: <Search size={17} />,
        title: "Websuche mit Quellen",
        text: "Aktuelle Antworten mit echten Quellenangaben direkt im Chat — inkl. Hinweis, wenn nichts Verlässliches gefunden wurde.",
        badge: "Neu",
        badgeStyle: "border-sky-300/30 bg-sky-300/10 text-sky-100/90",
      },
      {
        icon: <Mic size={17} />,
        title: "Spracheingabe & Vorlesen",
        text: "Nachrichten diktieren und Antworten direkt im Chat verfassen — schnell, ohne Tippen.",
        badge: "Tool",
        badgeStyle: "border-white/20 bg-white/[0.06] text-white/80",
      },
    ],
  },
  {
    heading: "Erstellen: Bild, Video & Studio",
    sub: "Aus Text werden Medien — direkt im Chat oder im Studio.",
    items: [
      {
        icon: <ImageIcon size={17} />,
        title: "Bildgenerierung",
        text: "Cineastische Bilder per Text-Prompt — mit Vorschau-Karte und Status direkt in der Nachricht.",
        badge: "Neu",
        badgeStyle: "border-sky-300/30 bg-sky-300/10 text-sky-100/90",
      },
      {
        icon: <Video size={17} />,
        title: "Videogenerierung",
        text: "Kurze Clips aus Text erstellen (Agnes-Modelle) — mit Fortschritt und Abruf im Chat.",
        badge: "Neu",
        badgeStyle: "border-sky-300/30 bg-sky-300/10 text-sky-100/90",
      },
      {
        icon: <Sparkles size={17} />,
        title: "Barada Studio",
        text: "Kreativ-Werkstatt für Bilder & Videos: Bild-zu-Video, Bild bearbeiten und Sammlungen verwalten.",
        badge: "Tool",
        badgeStyle: "border-white/20 bg-white/[0.06] text-white/80",
      },
    ],
  },
  {
    heading: "Arbeiten: Code, Flüge & Integrationen",
    sub: "Verxa wird zum Werkzeug — nicht nur zum Antworten.",
    items: [
      {
        icon: <Code2 size={17} />,
        title: "Verxa Code",
        text: "Eigene Projekte bauen: Vorschau, Datei-Editor, GitHub-Push und Vercel-Deploy — mit Code-Spezialisten wie Qwen3 Coder Plus & Codestral.",
        badge: "Tool",
        badgeStyle: "border-white/20 bg-white/[0.06] text-white/80",
      },
      {
        icon: <Plane size={17} />,
        title: "Flyvia Flugsuch",
        text: "@Flyvia im Chat erwähnen und Flüge suchen — mit Ergebnis-Karten, Preis und Buchungslink.",
        badge: "Neu",
        badgeStyle: "border-sky-300/30 bg-sky-300/10 text-sky-100/90",
      },
      {
        icon: <Mail size={17} />,
        title: "Google-Integration",
        text: "Gmail, Kalender & Drive verbinden: E-Mails suchen und lesen, Termine prüfen, Dateien finden — lesend und sicher.",
        badge: "Integration",
        badgeStyle: "border-violet-300/30 bg-violet-300/10 text-violet-100/90",
      },
      {
        icon: <Plug size={17} />,
        title: "Plugins",
        text: "Integrationen zentral verwalten — verbinden, Berechtigungen prüfen und wieder trennen.",
        badge: "Tool",
        badgeStyle: "border-white/20 bg-white/[0.06] text-white/80",
      },
      {
        icon: <KeyRound size={17} />,
        title: "API-Schlüssel",
        text: "Eigene Keys für die Verxa-API erstellen und Nutzung im Blick behalten.",
        badge: "Pro",
        badgeStyle: "border-amber-200/30 bg-amber-300/10 text-amber-100/90",
      },
    ],
  },
  {
    heading: "Bald verfügbar",
    sub: "Daran arbeiten wir gerade.",
    items: [
      {
        icon: <Globe size={17} />,
        title: "Browser-Agent",
        text: "Verxa öffnet echte Webseiten in einem Live-Browser und klickt sich durch — statt nur darüber zu schreiben.",
        badge: "Bald",
        badgeStyle: "border-amber-200/30 bg-amber-300/10 text-amber-100/90",
      },
      {
        icon: <MonitorSmartphone size={17} />,
        title: "Computer Use",
        text: "Web-Sitzungen direkt in Verxa steuern — mit Freigabe-Dialog und Safe Mode für sensible Aktionen.",
        badge: "Bald",
        badgeStyle: "border-amber-200/30 bg-amber-300/10 text-amber-100/90",
      },
      {
        icon: <Cpu size={17} />,
        title: "Mehr Modelle & Engine-Upgrades",
        text: "Laufend neue freie Modelle, schnelleres Streaming mit Fallback und bessere deutsche Antworten.",
        badge: "Laufend",
        badgeStyle: "border-white/20 bg-white/[0.06] text-white/80",
      },
    ],
  },
];

export default function NewsPage() {
  return (
    <div className="min-h-dvh bg-black text-white selection:bg-white/20">
      <header className="border-b border-white/[0.08] px-6 py-4 sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <VerxaMark size={24} />
            <span className="text-[15px] font-semibold">
              Verxa <span className="text-white/50">News</span>
            </span>
          </Link>
          <Link
            href="/chat"
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[13px] text-white/80 transition hover:border-white/30 hover:text-white"
          >
            <ArrowLeft size={14} /> Zum Chat
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[12px] font-medium text-white/75">
            <Sparkles size={13} /> Was ist neu bei Verxa
          </span>
          <h1 className="mt-4 text-[34px] font-medium tracking-tight sm:text-[46px]">
            Alle Tools & Neuheiten
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-[15px] text-white/60">
            Alles, was Verxa kann — Chat, Suche, Medien, Code, Reisen und Integrationen. Kurz erklärt, alles an einem Ort.
          </p>
        </div>

        <div className="mt-14 space-y-14">
          {sections.map((sec) => (
            <section key={sec.heading}>
              <h2 className="text-[20px] font-semibold tracking-tight">{sec.heading}</h2>
              <p className="mt-1 text-[13.5px] text-white/50">{sec.sub}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sec.items.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/25 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/85">
                        {item.icon}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${item.badgeStyle}`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[15.5px] font-semibold">{item.title}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/60">{item.text}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-white/10 bg-gradient-to-r from-violet-500/15 via-white/[0.04] to-sky-500/15 p-8 text-center">
          <h2 className="text-[20px] font-semibold">Am besten gleich ausprobieren</h2>
          <p className="mx-auto mt-1 max-w-md text-[13.5px] text-white/60">
            Stell Verxa eine Frage, lass ein Bild erstellen oder erwähne @Flyvia für Flüge.
          </p>
          <Link
            href="/chat"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[14px] font-semibold text-black transition hover:bg-white/85"
          >
            Jetzt chatten
          </Link>
        </div>
      </main>
    </div>
  );
}
