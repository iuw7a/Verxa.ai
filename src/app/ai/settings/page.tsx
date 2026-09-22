"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AiShell } from "@/components/ai/ai-shell";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import {
  readAiFiles,
  readPrefs,
  speechRecognitionSupported,
  writeAiFiles,
  writePrefs,
  type AiPrefs,
} from "@/lib/ai/prefs";
import { AI_DISCLAIMER } from "@/lib/ai/system";

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { aiChats, deleteChat, clearMemories, memories } = useWorkspace();
  const [prefs, setPrefs] = useState<AiPrefs>({ ttsEnabled: true, sttLang: "auto" });
  const [model, setModel] = useState<string>("…");
  const [gateway, setGateway] = useState<string>("…");

  useEffect(() => {
    setPrefs(readPrefs());
    fetch("/api/ai/model", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { model?: string; gateway?: string }) => {
        if (j.model) setModel(j.model);
        if (j.gateway) setGateway(j.gateway);
      })
      .catch(() => {
        setModel("unavailable");
        setGateway("unavailable");
      });
  }, []);

  function save(next: AiPrefs) {
    setPrefs(next);
    writePrefs(next);
  }

  function clearAiChats() {
    if (!window.confirm(`Delete all ${aiChats.length} Verxa AI conversations?`)) return;
    for (const c of aiChats) deleteChat(c.id);
  }

  return (
    <AiShell title="Settings" subtitle="Voice, model, data & safety">
      <div className="flex min-h-full flex-col gap-4 px-4 py-4 pb-8">
        {/* Account */}
        <section className="rounded-2xl bg-white/[0.06] p-4">
          <p className="text-[11px] tracking-widest text-white/40 uppercase">Account</p>
          <p className="mt-1 truncate text-[15px] font-medium">
            {user?.email ?? "Guest (not signed in)"}
          </p>
          <p className="mt-0.5 text-[12px] text-white/40">
            All AI modules share this account — chat, memory, voice, images, and files.
          </p>
          {user ? (
            <button
              onClick={() => router.push("/logout")}
              className="mt-3 min-h-[48px] w-full rounded-xl bg-white/[0.07] text-[14px] active:bg-white/[0.14]"
            >
              Sign out
            </button>
          ) : (
            <a
              href="/login"
              className="mt-3 flex min-h-[48px] items-center justify-center rounded-xl text-[14px] font-semibold"
              style={{ background: "linear-gradient(135deg,#8ea4ff,#5b7cff)" }}
            >
              Sign in to sync everywhere
            </a>
          )}
        </section>

        {/* Voice */}
        <section className="rounded-2xl bg-white/[0.06] p-4">
          <p className="text-[11px] tracking-widest text-white/40 uppercase">Voice</p>
          <button
            onClick={() => save({ ...prefs, ttsEnabled: !prefs.ttsEnabled })}
            className="mt-2 flex min-h-[52px] w-full items-center justify-between"
          >
            <span className="text-[15px]">Read replies aloud</span>
            <span
              className="inline-block h-7 w-12 rounded-full p-1"
              style={{ background: prefs.ttsEnabled ? "#34d399" : "rgba(255,255,255,0.2)" }}
            >
              <span
                className="block h-5 w-5 rounded-full bg-white"
                style={{ marginLeft: prefs.ttsEnabled ? "20px" : "0" }}
              />
            </span>
          </button>
          <label className="mt-1 block">
            <span className="text-[13px] text-white/50">Recognition language</span>
            <select
              value={prefs.sttLang}
              onChange={(e) => save({ ...prefs, sttLang: e.target.value })}
              className="mt-1 min-h-[52px] w-full rounded-xl bg-black/40 px-3 text-[15px] outline-none"
            >
              <option value="auto">Auto (device language)</option>
              <option value="en-US">English</option>
              <option value="de-DE">Deutsch</option>
              <option value="ar-SA">العربية</option>
              <option value="fr-FR">Français</option>
              <option value="tr-TR">Türkçe</option>
            </select>
          </label>
          {!speechRecognitionSupported() && (
            <p className="mt-2 text-[12px] text-white/40">
              This browser has no on-device recognition — the Verxa backend transcribes instead.
            </p>
          )}
        </section>

        {/* Model */}
        <section className="rounded-2xl bg-white/[0.06] p-4">
          <p className="text-[11px] tracking-widest text-white/40 uppercase">AI Model</p>
          <p className="mt-1 font-mono text-[14px] break-all">{model}</p>
          <p className="mt-0.5 text-[12px] text-white/40">
            Served by {gateway} · vision + streaming · chosen as the fastest full-capability model.
            Configured server-side — the API key never reaches this device.
          </p>
        </section>

        {/* Data */}
        <section className="rounded-2xl bg-white/[0.06] p-4">
          <p className="text-[11px] tracking-widest text-white/40 uppercase">Your data</p>
          <p className="mt-1 text-[13px] text-white/55">
            {aiChats.length} AI conversation{aiChats.length === 1 ? "" : "s"} ·{" "}
            {memories.length} memor{memories.length === 1 ? "y" : "ies"} ·{" "}
            {readAiFilesSafe()} file{readAiFilesSafe() === 1 ? "" : "s"}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={clearAiChats}
              disabled={!aiChats.length}
              className="min-h-[48px] rounded-xl bg-white/[0.07] text-[14px] text-red-300 disabled:opacity-40"
            >
              Delete all AI conversations
            </button>
            <button
              onClick={() => {
                if (window.confirm("Delete all uploaded files?")) writeAiFiles([]);
              }}
              className="min-h-[48px] rounded-xl bg-white/[0.07] text-[14px] text-red-300"
            >
              Delete all uploaded files
            </button>
            <button
              onClick={() => {
                if (window.confirm("Delete all memories?")) clearMemories();
              }}
              disabled={!memories.length}
              className="min-h-[48px] rounded-xl bg-white/[0.07] text-[14px] text-red-300 disabled:opacity-40"
            >
              Delete all memories
            </button>
          </div>
        </section>

        {/* Safety */}
        <section className="rounded-2xl bg-white/[0.06] p-4">
          <p className="text-[11px] tracking-widest text-white/40 uppercase">Medical safety</p>
          <p className="mt-1 text-[13px] leading-5 text-white/60">{AI_DISCLAIMER}</p>
          <p className="mt-2 text-[13px] leading-5 text-white/60">
            Verxa AI never prescribes or changes medication on its own. In emergencies, contact
            your local emergency number immediately.
          </p>
        </section>
      </div>
    </AiShell>
  );
}

function readAiFilesSafe(): number {
  try {
    return readAiFiles().length;
  } catch {
    return 0;
  }
}
