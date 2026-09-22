"use client";

import { useState } from "react";
import { AccountChrome } from "@/components/account/account-chrome";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { useAuth } from "@/providers/auth-provider";

export default function ProfilePage() {
  const { profile, saveProfile, user, setAuthOpen } = useAuth();
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  return (
    <AccountChrome
      title="Profile"
      description="How you appear in Verxa. Guests can set this locally; sign in to keep it."
    >
      <div className="flex items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-accent-soft">
          {draft.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg text-muted">Photo</span>
          )}
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <span className="inline-flex h-10 items-center rounded-[10px] border border-line px-4 text-[14px]">
              Upload
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () =>
                  update("avatarUrl", String(reader.result ?? ""));
                reader.readAsDataURL(file);
              }}
            />
          </label>
          <Button
            type="button"
            variant="ghost"
            onClick={() => update("avatarUrl", "")}
          >
            Remove
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        <Field label="Display name">
          <Input
            value={draft.displayName}
            onChange={(e) => update("displayName", e.target.value)}
          />
        </Field>
        <Field label="Username">
          <Input
            value={draft.username}
            onChange={(e) => update("username", e.target.value)}
            placeholder="verxa"
          />
        </Field>
        <Field
          label="Email"
          hint={
            draft.emailVerified || user?.email_confirmed_at
              ? "Verified"
              : "Unverified — confirm from the link we send after sign up."
          }
        >
          <Input
            type="email"
            value={draft.email || user?.email || ""}
            onChange={(e) => update("email", e.target.value)}
          />
        </Field>
        <Field label="Bio">
          <Textarea
            value={draft.bio}
            onChange={(e) => update("bio", e.target.value)}
            placeholder="A few lines about how you like to work."
          />
        </Field>
        <Field label="Location">
          <Input
            value={draft.location}
            onChange={(e) => update("location", e.target.value)}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={() => {
            saveProfile(draft);
            setSaved(true);
          }}
        >
          Save changes
        </Button>
        <Button variant="ghost" onClick={() => setDraft(profile)}>
          Cancel
        </Button>
        {!user ? (
          <button
            className="ml-auto text-[13px] text-accent"
            onClick={() => setAuthOpen(true)}
          >
            Sign in to sync
          </button>
        ) : null}
        {saved ? <span className="text-[13px] text-ok">Saved</span> : null}
      </div>
    </AccountChrome>
  );
}
