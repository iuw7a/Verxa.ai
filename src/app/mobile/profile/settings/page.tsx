"use client";

import { useEffect, useState } from "react";
import { MobileHeader, MobileShell } from "@/components/mobile/mobile-shell";
import { GlassToggle } from "@/components/mobile/profile-settings-ui";
import { useTheme } from "@/providers/theme-provider";
import { useWorkspace } from "@/providers/workspace-provider";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 first:mt-0">
      <p className="mb-2 px-1 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
        {title}
      </p>
      <div className="glass glass-spec overflow-hidden rounded-[20px]">{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3 last:border-b-0">
      <span className="text-[14.5px] text-ink">{label}</span>
      {children}
    </div>
  );
}

const languages = [
  ["en", "English"],
  ["de", "Deutsch"],
  ["fr", "Français"],
  ["es", "Español"],
] as const;

type ServerPrefs = {
  marketing_consent: boolean;
  product_updates: boolean;
  newsletters: boolean;
  tips_tutorials: boolean;
  new_features: boolean;
} | null;

const SERVER_ROWS = [
  ["marketing_consent", "Marketing & promotions"],
  ["product_updates", "Product updates"],
  ["newsletters", "Newsletter"],
  ["tips_tutorials", "Tips & tutorials"],
  ["new_features", "New features"],
] as const;

function ServerEmailSection() {
  const [prefs, setPrefs] = useState<ServerPrefs>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/email/preferences");
        if (!res.ok) return;
        const json = (await res.json()) as { preferences?: ServerPrefs };
        if (!cancelled && json.preferences) setPrefs(json.preferences);
      } catch {
        /* signed out — section stays hidden */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !prefs) return null;

  async function set(key: keyof NonNullable<ServerPrefs>, value: boolean) {
    const prev = prefs;
    setPrefs({ ...prefs!, [key]: value });
    try {
      const res = await fetch("/api/email/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value, source: "settings-mobile" }),
      });
      const json = (await res.json()) as { preferences?: ServerPrefs };
      if (json.preferences) setPrefs(json.preferences);
      else setPrefs(prev);
    } catch {
      setPrefs(prev);
    }
  }

  return (
    <Section title="Email account">
      {SERVER_ROWS.map(([key, label]) => (
        <Row key={key} label={label}>
          <GlassToggle
            checked={Boolean(prefs[key])}
            onChange={(v) => void set(key, v)}
            label={label}
          />
        </Row>
      ))}
    </Section>
  );
}

export default function MobileSettingsPage() {
  const { settings, updateSettings, chats } = useWorkspace();
  const { setTheme, theme } = useTheme();

  return (
    <MobileShell>
      <MobileHeader title="Settings" backHref="/mobile/profile" />
      <div className="mobile-scroll glass-fade-y min-h-0 flex-1">
        <div className="mx-auto w-full max-w-[560px] px-4 py-4">
          <Section title="Appearance">
            <Row label="Theme">
              <div className="glass-btn flex gap-1 rounded-full p-1">
                {(["system", "light", "dark"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => {
                      setTheme(value);
                      updateSettings({ ...settings, theme: value });
                    }}
                    className={`tab-item rounded-full px-3 py-1.5 text-[12.5px] capitalize transition-all duration-300 ${
                      theme === value
                        ? "bg-accent-soft font-medium text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                        : "text-muted"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </Row>
          </Section>

          <Section title="Language">
            <Row label="Interface language">
              <select
                value={settings.language}
                onChange={(e) =>
                  updateSettings({ ...settings, language: e.target.value })
                }
                className="rounded-[10px] border border-white/12 bg-white/[0.05] px-2.5 py-1.5 text-[13.5px] text-ink outline-none"
              >
                {languages.map(([code, label]) => (
                  <option key={code} value={code} className="bg-[#121218]">
                    {label}
                  </option>
                ))}
              </select>
            </Row>
          </Section>

          <Section title="Notifications">
            {(
              [
                ["product", "Product updates"],
                ["security", "Security alerts"],
                ["marketing", "Tips and announcements"],
              ] as const
            ).map(([key, label]) => (
              <Row key={key} label={label}>
                <GlassToggle
                  checked={settings.notifications[key]}
                  onChange={(v) =>
                    updateSettings({
                      ...settings,
                      notifications: { ...settings.notifications, [key]: v },
                    })
                  }
                  label={label}
                />
              </Row>
            ))}
          </Section>

          <Section title="Email preferences">
            {(
              [
                ["weeklySummary", "Weekly summary"],
                ["chatDigest", "Chat digest"],
                ["billing", "Billing receipts"],
              ] as const
            ).map(([key, label]) => (
              <Row key={key} label={label}>
                <GlassToggle
                  checked={settings.emailNotifications[key]}
                  onChange={(v) =>
                    updateSettings({
                      ...settings,
                      emailNotifications: {
                        ...settings.emailNotifications,
                        [key]: v,
                      },
                    })
                  }
                  label={label}
                />
              </Row>
            ))}
          </Section>

          <ServerEmailSection />

          <Section title="Data">
            <Row label="Export my data">
              <button
                onClick={() => {
                  const blob = new Blob(
                    [JSON.stringify({ settings, chats }, null, 2)],
                    { type: "application/json" },
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "verxa-export.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="glass-btn tab-item rounded-full px-3.5 py-1.5 text-[12.5px] text-muted"
              >
                Export
              </button>
            </Row>
          </Section>
        </div>
      </div>
    </MobileShell>
  );
}
