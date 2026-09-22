"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Globe2, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CodeBlock } from "@/components/docs/code-block";

type Section = {
  id: string;
  title: string;
  group: string;
  keywords: string;
  body: React.ReactNode;
};

const mcpConfig = `{
  "mcpServers": {
    "browsermcp": {
      "command": "npx",
      "args": ["@browsermcp/mcp@latest"]
    }
  }
}`;

const opencodeConfig = `{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "browsermcp": {
      "type": "local",
      "command": ["npx", "@browsermcp/mcp@latest"],
      "enabled": true
    }
  }
}`;

const SECTIONS: Section[] = [
  {
    id: "introduction",
    title: "Introduction",
    group: "Getting started",
    keywords: "browsermcp browser extension mcp overview",
    body: (
      <>
        <p>
          <strong>BrowserMCP</strong> connects an AI agent to{" "}
          <strong>your own Chrome browser</strong> via a browser extension and
          the Model Context Protocol (MCP). The agent can then navigate, click,
          type and read pages — in the browser where you are already logged in.
        </p>
        <p>
          This is the counterpart to Verxa&apos;s{" "}
          <strong>Live Browser Agent</strong>, which drives an isolated cloud
          browser: use BrowserMCP when the task needs <em>your</em> browser —
          your logins, your tabs, your session.
        </p>
        <ul>
          <li>
            <code>browser_navigate</code> — open a URL
          </li>
          <li>
            <code>browser_snapshot</code> — accessibility tree with element
            references
          </li>
          <li>
            <code>browser_click</code> / <code>browser_hover</code> — interact
            with elements
          </li>
          <li>
            <code>browser_type</code> — fill inputs, optionally submit
          </li>
          <li>
            <code>browser_go_back</code> / <code>browser_go_forward</code> —
            history navigation
          </li>
          <li>
            <code>browser_select_option</code> — choose dropdown entries
          </li>
        </ul>
        <p>
          …plus further tools (tabs, screenshots and more) exposed by the
          server.
        </p>
      </>
    ),
  },
  {
    id: "extension",
    title: "1 · Install the extension",
    group: "Getting started",
    keywords: "chrome extension install store",
    body: (
      <>
        <p>
          Install the <strong>Browser MCP</strong> extension from the Chrome Web
          Store and pin it to your toolbar. The extension bridges your tabs and
          the local MCP server — nothing leaves your machine except what the
          agent reads on your behalf.
        </p>
        <p>
          Official install guide:{" "}
          <a
            href="https://docs.browsermcp.io/installation"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            docs.browsermcp.io/installation
          </a>
        </p>
      </>
    ),
  },
  {
    id: "client-config",
    title: "2 · Connect an MCP client",
    group: "Getting started",
    keywords: "mcp client config cursor vscode claude opencode json",
    body: (
      <>
        <p>
          Add the server to any MCP-capable client (Cursor, VS Code, Claude
          Desktop, Windsurf, opencode …). Generic config:
        </p>
        <CodeBlock label="mcp.json" code={mcpConfig} />
        <h4>opencode</h4>
        <p>
          In <code>.opencode/opencode.json</code> (this is how the Verxa
          repository itself wires it):
        </p>
        <CodeBlock label=".opencode/opencode.json" code={opencodeConfig} />
        <p>
          Restart the client afterwards so it picks up the new server. Chrome
          must be running with the extension enabled.
        </p>
      </>
    ),
  },
  {
    id: "usage",
    title: "Using it with Verxa",
    group: "Guides",
    keywords: "usage verxa workflow snapshot click login session",
    body: (
      <>
        <p>Typical workflow once the client shows the browser tools:</p>
        <ul>
          <li>
            Ask the agent to open a page: it calls{" "}
            <code>browser_navigate</code>.
          </li>
          <li>
            It reads <code>browser_snapshot</code> to find element references.
          </li>
          <li>
            It clicks / types with <code>browser_click</code> and{" "}
            <code>browser_type</code> — you watch it happen live in your own
            tabs.
          </li>
        </ul>
        <p>
          Because it is your browser, sites where you are logged in just work —
          no credentials are ever pasted or shared.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security notes",
    group: "Guides",
    keywords: "security privacy local permissions secrets localhost",
    body: (
      <>
        <ul>
          <li>
            The MCP server runs locally (<code>npx</code> on your machine) and
            talks to Chrome on <code>localhost</code> — page content is never
            routed through third-party servers by BrowserMCP itself.
          </li>
          <li>
            The agent acts with <em>your</em> session: review destructive
            actions (orders, deletions, messages) before confirming them.
          </li>
          <li>
            Never share secrets via page content, and keep the extension
            enabled only while you actively use it.
          </li>
        </ul>
      </>
    ),
  },
];

const GROUPS = ["Getting started", "Guides"];

export default function BrowserDocsPage() {
  const [active, setActive] = useState("introduction");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return SECTIONS;
    return SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(query) || s.keywords.includes(query),
    );
  }, [q]);

  const section = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];

  return (
    <AppShell
      topBar={
        <Link
          href="/docs/api"
          className="rounded-full border border-line px-4 py-1.5 text-[13px] text-muted transition hover:text-ink"
        >
          API Docs
        </Link>
      }
    >
      <div className="mx-auto w-full max-w-[1000px] px-2 py-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-line bg-white/[0.04]">
            <Globe2 size={19} className="text-accent" />
          </span>
          <div>
            <h1 className="text-[22px] font-medium tracking-[-0.02em] text-ink">
              BrowserMCP
            </h1>
            <p className="text-[13.5px] text-muted">
              Drive your own Chrome browser with an AI agent — via Verxa or any
              MCP client.
            </p>
          </div>
        </div>

        <div className="mt-7 flex gap-8">
          <aside className="hidden w-[230px] shrink-0 md:block">
            <div className="sticky top-8">
              <div className="flex items-center gap-2 rounded-[12px] border border-line bg-white/[0.03] px-3 py-2">
                <Search size={14} className="shrink-0 text-faint" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search docs…"
                  className="h-6 w-full min-w-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
                />
              </div>
              <nav className="mt-4 space-y-4">
                {GROUPS.map((group) => {
                  const items = filtered.filter((s) => s.group === group);
                  if (!items.length) return null;
                  return (
                    <div key={group}>
                      <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-faint">
                        {group}
                      </p>
                      <div className="space-y-0.5">
                        {items.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setActive(s.id)}
                            className={`block w-full rounded-[9px] px-3 py-1.5 text-left text-[13px] transition ${
                              active === s.id
                                ? "bg-accent-soft font-medium text-accent"
                                : "text-muted hover:text-ink"
                            }`}
                          >
                            {s.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 ? (
                  <p className="px-3 text-[12.5px] text-faint">
                    No matches for “{q}”.
                  </p>
                ) : null}
              </nav>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mb-5 flex gap-2 overflow-x-auto md:hidden">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] ${
                    active === s.id
                      ? "bg-accent-soft font-medium text-accent"
                      : "border border-line text-muted"
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>

            <article className="min-h-[480px]">
              <h2 className="text-[19px] font-medium tracking-[-0.02em] text-ink">
                {section.title}
              </h2>
              <div className="prose-api mt-4 space-y-4 text-[14.5px] leading-7 text-muted [&_code]:rounded-[6px] [&_code]:bg-white/[0.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:text-[#c9d2ff] [&_h4]:mt-6 [&_h4]:text-[14px] [&_h4]:font-medium [&_h4]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink">
                {section.body}
              </div>

              <div className="mt-10 flex items-center justify-between border-t border-line pt-5">
                {SECTIONS.indexOf(section) > 0 ? (
                  <button
                    onClick={() =>
                      setActive(SECTIONS[SECTIONS.indexOf(section) - 1].id)
                    }
                    className="text-[13.5px] text-muted hover:text-ink"
                  >
                    ← {SECTIONS[SECTIONS.indexOf(section) - 1].title}
                  </button>
                ) : (
                  <span />
                )}
                {SECTIONS.indexOf(section) < SECTIONS.length - 1 ? (
                  <button
                    onClick={() =>
                      setActive(SECTIONS[SECTIONS.indexOf(section) + 1].id)
                    }
                    className="text-[13.5px] text-accent hover:underline"
                  >
                    {SECTIONS[SECTIONS.indexOf(section) + 1].title} →
                  </button>
                ) : (
                  <span />
                )}
              </div>
            </article>
          </main>
        </div>
      </div>
    </AppShell>
  );
}
