"use client";

import { readJson, writeJson, removeKey } from "@/lib/storage";

export type AiFileRecord = {
  id: string;
  name: string;
  mime: string;
  size: number;
  /** Extracted plain text (truncated) — what the assistant actually reads. */
  text: string;
  truncated: boolean;
  createdAt: number;
};

export type AiPrefs = {
  ttsEnabled: boolean;
  sttLang: string;
};

const PREFS_KEY = "aiPrefs";
const ACTIVE_KEY = "aiActiveChat";
const FILES_KEY = "aiFiles";

export function readPrefs(): AiPrefs {
  return readJson<AiPrefs>(PREFS_KEY, { ttsEnabled: true, sttLang: "auto" });
}

export function writePrefs(p: AiPrefs) {
  writeJson(PREFS_KEY, p);
}

export function readActiveChat(): string | null {
  return readJson<string | null>(ACTIVE_KEY, null);
}

export function writeActiveChat(id: string | null) {
  if (id) writeJson(ACTIVE_KEY, id);
  else removeKey(ACTIVE_KEY);
}

export function readAiFiles(): AiFileRecord[] {
  return readJson<AiFileRecord[]>(FILES_KEY, []);
}

export function writeAiFiles(files: AiFileRecord[]) {
  writeJson(FILES_KEY, files);
}

/** Speak text aloud (real browser TTS, cancelled on unmount by callers). */
export function speakText(text: string, lang?: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const clean = text
    .replace(/[*_`#>\-|[\]()]/g, "")
    .replace(/\n+/g, ". ")
    .slice(0, 1200);
  if (!clean.trim()) return false;
  const utter = new SpeechSynthesisUtterance(clean);
  if (lang && lang !== "auto") utter.lang = lang;
  window.speechSynthesis.speak(utter);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function speechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}
