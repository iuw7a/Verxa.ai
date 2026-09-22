"use client";

import { useEffect, useState } from "react";
import { AccountChrome } from "@/components/account/account-chrome";
import { Button, Card, Field, Toggle } from "@/components/ui/primitives";
import { useTheme } from "@/providers/theme-provider";
import { useWorkspace } from "@/providers/workspace-provider";

type ServerPrefs = {
  marketing_consent: boolean;
  product_updates: boolean;
  newsletters: boolean;
  tips_tutorials: boolean;
  new_features: boolean;
} | null;

const SERVER_ROWS = [
  ["marketing_consent", "Marketing & promotions", "Optional offers and campaigns. Off by default."],
  ["product_updates", "Product updates", "Important product news."],
  ["newsletters", "Newsletter", "The Verxa newsletter."],
  ["tips_tutorials", "Tips & tutorials", "Get more out of Verxa."],
  ["new_features", "New features", "Heads-up when features launch."],
] as const;

function ServerEmailPrefs() {
  const [prefs, setPrefs] = useState<ServerPrefs>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/email/preferences");
        if (!res.ok) return;
        const json = (await res.json()) as { preferences?: ServerPrefs };
        if (!cancelled && json.preferences) setPrefs(json.preferences);
      } catch {
        /* offline / signed out — card stays hidden */
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
    setSaving(key);
    try {
      const res = await fetch("/api/email/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value, source: "settings" }),
      });
      const json = (await res.json()) as { preferences?: ServerPrefs };
      if (json.preferences) setPrefs(json.preferences);
      else setPrefs(prev);
    } catch {
      setPrefs(prev);
    }
    setSaving(null);
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-[13px] text-muted">Email preferences (account)</p>
        <p className="mt-1 text-[12.5px] text-muted">
          Security & account emails are always on. Marketing needs your explicit
          opt-in —{" "}
          <a href="/unsubscribe" className="underline underline-offset-4">
            unsubscribe
          </a>{" "}
          anytime.
        </p>
      </div>
      {SERVER_ROWS.map(([key, label, hint]) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <span className="text-[14px]">
            {label}
            <span className="block text-[12px] text-muted">{hint}</span>
          </span>
          <Toggle
            checked={Boolean(prefs[key])}
            onChange={(v) => void set(key, v)}
          />
        </div>
      ))}
      {saving ? <p className="text-[12px] text-muted">Saving…</p> : null}
    </Card>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, chats } = useWorkspace();
  const { setTheme, theme } = useTheme();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <AccountChrome
      title="Account settings"
      description="Language, appearance, and how Verxa talks to you outside the product."
    >
      <Card>
        <Field label="Language">
          <select
            value={settings.language}
            onChange={(e) =>
              updateSettings({ ...settings, language: e.target.value })
            }
            className="h-11 w-full rounded-[12px] border border-line bg-white/[0.03] px-3 text-[14px] outline-none"
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
          </select>
        </Field>
      </Card>

      <Card>
        <p className="mb-3 text-[13px] text-muted">Theme</p>
        <div className="flex gap-2">
          {(["system", "light", "dark"] as const).map((value) => (
            <button
              key={value}
              onClick={() => {
                setTheme(value);
                updateSettings({ ...settings, theme: value });
              }}
              className={`h-10 rounded-[10px] px-4 text-[13px] capitalize ${
                theme === value
                  ? "bg-accent-soft text-ink"
                  : "border border-line text-muted"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="text-[13px] text-muted">Notifications</p>
        {(
          [
            ["product", "Product updates"],
            ["security", "Security alerts"],
            ["marketing", "Tips and announcements"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-[14px]">{label}</span>
            <Toggle
              checked={settings.notifications[key]}
              onChange={(v) =>
                updateSettings({
                  ...settings,
                  notifications: { ...settings.notifications, [key]: v },
                })
              }
            />
          </div>
        ))}
      </Card>

      <Card className="space-y-4">
        <p className="text-[13px] text-muted">Email preferences</p>
        {(
          [
            ["weeklySummary", "Weekly summary"],
            ["chatDigest", "Chat digest"],
            ["billing", "Billing receipts"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-[14px]">{label}</span>
            <Toggle
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
            />
          </div>
        ))}
      </Card>

      <ServerEmailPrefs />

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-[15px]">Export my data</p>
          <p className="mt-1 text-[13px] text-muted">
            Download a JSON file of chats and settings stored on this device.
          </p>
        </div>
        <Button
          variant="subtle"
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
        >
          Export
        </Button>
      </Card>

      <Card className="border-danger/20">
        <p className="text-[15px] text-danger">Danger zone</p>
        <p className="mt-1 text-[13px] text-muted">
          Delete this account and local Verxa data. This cannot be undone.
        </p>
        {confirmDelete ? (
          <div className="mt-4 flex gap-2">
            <Button
              variant="danger"
              onClick={() => {
                localStorage.clear();
                window.location.href = "/";
              }}
            >
              Confirm delete
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            className="mt-4"
            variant="danger"
            onClick={() => setConfirmDelete(true)}
          >
            Delete account
          </Button>
        )}
      </Card>
    </AccountChrome>
  );
}
