"use client";

import { useRef, useState } from "react";
import { nanoid } from "nanoid";
import { AiShell } from "@/components/ai/ai-shell";
import { useWorkspace } from "@/providers/workspace-provider";
import {
  readActiveChat,
  readAiFiles,
  writeActiveChat,
  writeAiFiles,
  type AiFileRecord,
} from "@/lib/ai/prefs";

const ACCEPT = ".txt,.md,.csv,.json,.log";
const MAX_BYTES = 500_000;
const MAX_TEXT = 20_000;

export default function FilesPage() {
  const { sendAiMessage } = useWorkspace();
  const [files, setFiles] = useState<AiFileRecord[]>(() => readAiFiles());
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function persist(next: AiFileRecord[]) {
    setFiles(next);
    writeAiFiles(next);
  }

  async function add(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setError(null);
    const lower = file.name.toLowerCase();
    const okExt = [".txt", ".md", ".csv", ".json", ".log"].some((e) => lower.endsWith(e));
    if (!okExt && file.type !== "" && !file.type.startsWith("text/") && file.type !== "application/json") {
      setError(
        `"${file.name}" cannot be analyzed — only plain-text files (.txt, .md, .csv, .json, .log) are supported. Scanned PDFs and Word documents are not readable yet.`,
      );
      return;
    }
    if (lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx")) {
      setError(
        `"${file.name}" cannot be analyzed — Word documents and PDFs are not supported yet. Paste the text into a .txt file instead.`,
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`"${file.name}" is too large (over ~500 KB). Please use a smaller file.`);
      return;
    }
    try {
      const raw = await file.text();
      const truncated = raw.length > MAX_TEXT;
      const rec: AiFileRecord = {
        id: nanoid(8),
        name: file.name,
        mime: file.type || "text/plain",
        size: file.size,
        text: raw.slice(0, MAX_TEXT),
        truncated,
        createdAt: Date.now(),
      };
      persist([rec, ...files]);
    } catch {
      setError(`Could not read "${file.name}". Please try again.`);
    }
  }

  function remove(id: string) {
    persist(files.filter((f) => f.id !== id));
  }

  async function askAbout(rec: AiFileRecord) {
    setSendingId(rec.id);
    const text = [
      `I uploaded a file named "${rec.name}" (${Math.round(rec.size / 1024)} KB).`,
      rec.truncated ? "Its content was truncated to the first 20,000 characters." : "Here is its full content:",
      "",
      "```",
      rec.text,
      "```",
      "",
      "Please summarize what is relevant for my diabetes management and tell me what I can ask about it.",
    ].join("\n");
    const id = await sendAiMessage(readActiveChat(), text);
    if (id) {
      writeActiveChat(id);
      window.location.href = `/ai/chat/${id}`;
    } else {
      setSendingId(null);
    }
  }

  return (
    <AiShell title="Files" subtitle="Text files the assistant can read">
      <div className="flex min-h-full flex-col px-4 py-5">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="flex min-h-[76px] items-center justify-center gap-2 rounded-3xl text-[15px] font-semibold"
          style={{ background: "linear-gradient(135deg,#8ea4ff,#5b7cff)" }}
        >
          ＋ Upload a file
        </button>
        <p className="mt-2 text-center text-[12px] text-white/40">
          Supported: .txt, .md, .csv, .json, .log (up to ~500 KB)
        </p>

        {error ? (
          <p className="mt-3 rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
            {error}
          </p>
        ) : null}

        {files.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-14 text-center">
            <span className="text-[40px] text-white/25">🗎</span>
            <p className="mt-3 text-[15px] text-white/60">No files yet</p>
            <p className="mt-1 max-w-[260px] text-[12px] text-white/35">
              Upload readings exports, meal logs, or notes — then discuss them with Verxa AI.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {files.map((f) => (
              <div key={f.id} className="rounded-2xl bg-white/[0.06] p-4">
                <p className="truncate text-[15px] font-medium">{f.name}</p>
                <p className="mt-0.5 text-[12px] text-white/40">
                  {Math.round(f.size / 1024)} KB ·{" "}
                  {new Date(f.createdAt).toLocaleDateString()}
                  {f.truncated ? " · truncated" : ""}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => void askAbout(f)}
                    disabled={sendingId === f.id}
                    className="min-h-[48px] flex-1 rounded-xl text-[14px] font-semibold disabled:opacity-40"
                    style={{ background: "rgba(142,164,255,0.16)" }}
                  >
                    {sendingId === f.id ? "Opening…" : "Discuss with AI →"}
                  </button>
                  <button
                    onClick={() => remove(f.id)}
                    aria-label={`Delete ${f.name}`}
                    className="min-h-[48px] rounded-xl bg-white/[0.07] px-4 text-[14px] text-red-300 active:bg-white/[0.14]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AiShell>
  );
}
