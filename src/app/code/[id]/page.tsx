"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Crown,
  Download,
  ExternalLink,
  Eye,
  FileCode2,
  FilePlus2,
  FileText,
  FolderGit2,
  FolderSearch,
  GitBranch,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  MonitorSmartphone,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  TerminalSquare,
  X,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import type { CodeMessage, CodeProject } from "@/lib/code-types";
import MiniChess from "@/components/code/mini-chess";
import { VerxaMark } from "@/components/brand/verxa-mark";
import { AccountMenu } from "@/components/code/account-menu";

type CodeFile = { path: string; content: string; previousContent: string | null; updatedAt: string };
type Tab = "preview" | "files" | "diff";
type Device = "desktop" | "tablet" | "mobile";
type AgentStatus = "idle" | "working";
type Activity = { id: number; tool: string; path?: string; done: boolean };

function activityLabel(tool: string, path?: string): string {
  const p = path ? ` ${path}` : "";
  switch (tool) {
    case "write_file": return `Edit${p}`;
    case "read_file": return `Read${p}`;
    case "list_files": return "List project files";
    case "run_command": return `Run ${path ?? "command"}`;
    default: return tool;
  }
}

type DiffRow = { type: "same" | "add" | "del"; text: string };
function diffLines(oldStr: string, newStr: string): DiffRow[] {
  const a = oldStr.split("\n");
  const b = newStr.split("\n");
  if (a.length * b.length > 40000) {
    return [
      ...a.slice(0, 400).map((t): DiffRow => ({ type: "del", text: t })),
      ...b.slice(0, 400).map((t): DiffRow => ({ type: "add", text: t })),
    ];
  }
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      rows.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ type: "del", text: a[i] });
      i++;
    } else {
      rows.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < m) rows.push({ type: "del", text: a[i++] });
  while (j < n) rows.push({ type: "add", text: b[j++] });
  return rows;
}

const DEVICE_WIDTH: Record<Device, string> = { desktop: "100%", tablet: "768px", mobile: "390px" };

export default function CodeProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<CodeProject | null>(null);
  const [messages, setMessages] = useState<CodeMessage[]>([]);
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [draft, setDraft] = useState("");
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [statusText, setStatusText] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("preview");
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [device, setDevice] = useState<Device>("desktop");
  const [deploying, setDeploying] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [cookedSecs, setCookedSecs] = useState<number | null>(null);
  const [chessOpen, setChessOpen] = useState(false);
  const [mobileActiveView, setMobileActiveView] = useState<"chat" | "preview">("preview");
  const [copied, setCopied] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const workStartRef = useRef(0);
  const activityIdRef = useRef(0);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/code/projects/${id}/files`, { cache: "no-store" });
      const json = (await res.json()) as { files?: CodeFile[] };
      if (Array.isArray(json.files)) {
        setFiles(json.files);
        if (!openFile && json.files.length > 0) {
          const main = json.files.find((f) => f.path.includes("page.tsx") || f.path === "index.html") || json.files[0];
          setOpenFile(main.path);
        }
      }
    } catch {
      // Best effort
    }
  }, [id, openFile]);

  const load = useCallback(async () => {
    try {
      const [pRes, mRes] = await Promise.all([
        fetch(`/api/code/projects/${id}`, { cache: "no-store" }),
        fetch(`/api/code/projects/${id}/messages`, { cache: "no-store" }),
      ]);
      if (pRes.status === 404 || mRes.status === 404) {
        setNotFound(true);
        return;
      }
      const pJson = (await pRes.json()) as { project?: CodeProject };
      const mJson = (await mRes.json()) as { messages?: CodeMessage[] };
      if (pJson.project) setProject(pJson.project);
      if (Array.isArray(mJson.messages)) setMessages(mJson.messages);
      await loadFiles();
    } catch {
      setError("Could not load the project. Please reload the page.");
    } finally {
      setLoading(false);
    }
  }, [id, loadFiles]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?next=${encodeURIComponent(`/code/${id}`)}`);
      return;
    }
    if (!authLoading) void load();
  }, [authLoading, user, id, load, router]);

  useEffect(() => {
    if (authLoading || !user) return;
    void fetch(`/api/code/projects/${id}/deployments`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { deployments?: { url: string | null; status: string }[] }) => {
        const ok = (j.deployments ?? []).find((d) => d.status === "success" && d.url);
        if (ok?.url) setLiveUrl(ok.url);
      })
      .catch(() => {});
  }, [authLoading, user, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (agentStatus !== "working") return;
    workStartRef.current = Date.now();
    setElapsed(0);
    const t = window.setInterval(() => setElapsed(Math.floor((Date.now() - workStartRef.current) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [agentStatus]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function send(text: string) {
    const value = text.trim();
    if (!value || agentStatus !== "idle") return;
    setError(null);
    setDraft("");
    const userMsg: CodeMessage = { id: `local-${Date.now()}`, role: "user", content: value, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setAgentStatus("working");
    setStatusText("Analyzing prompt & dependencies…");
    setActivities([]);
    setCookedSecs(null);

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() }]);

    const patchAssistant = (content: string) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content } : m)));

    try {
      const res = await fetch("/api/code/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id, content: value }),
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        patchAssistant("");
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setError(j?.error ?? "Could not start generation. Please try again.");
        setAgentStatus("idle");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";

      const handleEvent = (raw: string) => {
        const line = raw.split("\n").find((l) => l.startsWith("data:"));
        if (!line) return;
        const json = JSON.parse(line.slice(5).trim()) as {
          type: string;
          text?: string;
          path?: string;
          message?: string;
          url?: string;
          filesChanged?: number;
          tool?: string;
          input?: { path?: string; command?: string };
        };
        if (json.type === "status" && json.text) setStatusText(json.text);
        if (json.type === "delta" && json.text) {
          assembled += json.text;
          patchAssistant(assembled);
        }
        if (json.type === "tool_call" && json.tool) {
          const label = json.tool === "run_command" ? json.input?.command : json.input?.path;
          setActivities((prev) => [
            ...prev.map((a) => ({ ...a, done: true })),
            { id: ++activityIdRef.current, tool: json.tool ?? "", path: label, done: false },
          ]);
          setStatusText("Writing code & executing changes…");
        }
        if (json.type === "file_written") {
          setPanelOpen(true);
          void loadFiles();
        }
        if (json.type === "preview_ready" && json.url) {
          setLiveUrl(json.url);
          setPreviewKey((k) => k + 1);
          setToast("Live preview ready");
        }
        if (json.type === "done") {
          setCookedSecs(Math.max(1, Math.floor((Date.now() - workStartRef.current) / 1000)));
          setAgentStatus("idle");
          setActivities((prev) => prev.map((a) => ({ ...a, done: true })));
          void loadFiles();
        }
      };

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const p of parts) {
          if (p.trim()) {
            try {
              handleEvent(p);
            } catch {
              // Ignore line parse errors
            }
          }
        }
      }
    } catch {
      setError("Network interruption during generation.");
    } finally {
      setAgentStatus("idle");
    }
  }

  async function deploy() {
    if (deploying) return;
    setDeploying(true);
    setError(null);
    try {
      const res = await fetch(`/api/code/projects/${id}/deploy`, { method: "POST" });
      const j = (await res.json().catch(() => null)) as { deployment?: { url: string }; error?: string; hint?: string } | null;
      if (!res.ok || !j?.deployment) {
        setError(j?.hint ?? j?.error ?? "Deployment failed. Check API keys in settings.");
        return;
      }
      setLiveUrl(j.deployment.url);
      setToast("Deployed to Vercel!");
    } catch {
      setError("Deployment failed.");
    } finally {
      setDeploying(false);
    }
  }

  async function pushToGitHub() {
    if (pushing) return;
    setPushing(true);
    setError(null);
    try {
      const res = await fetch(`/api/code/projects/${id}/github`, { method: "POST" });
      const j = (await res.json().catch(() => null)) as { repo?: { url: string }; error?: string; hint?: string } | null;
      if (!res.ok || !j?.repo) {
        setError(j?.hint ?? j?.error ?? "Could not push to GitHub. Verify your GitHub token in settings.");
        return;
      }
      setToast("Pushed to GitHub!");
      window.open(j.repo.url, "_blank", "noopener");
    } catch {
      setError("Could not push to GitHub.");
    } finally {
      setPushing(false);
    }
  }

  async function downloadZip() {
    try {
      const res = await fetch(`/api/code/projects/${id}/zip`);
      if (!res.ok) {
        setError("Could not create ZIP.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.title.toLowerCase().replace(/\s+/g, "-") || "project"}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed.");
    }
  }

  function copyCode(content: string) {
    void navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#07080a] text-white">
        <div className="flex items-center gap-2 text-[14px] text-white/50">
          <Loader2 size={16} className="animate-spin text-[#10141a]" />
          <span>Opening workspace…</span>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#07080a] px-6 text-center text-white">
        <h1 className="text-[24px] font-semibold">Project not found</h1>
        <p className="max-w-[420px] text-[14px] leading-relaxed text-white/55">
          This project does not exist or has been removed.
        </p>
        <Link
          href="/code"
          className="mt-2 rounded-xl bg-[#10141a] px-5 py-2 text-[13.5px] font-semibold text-black transition hover:bg-[#171b22]"
        >
          Back to Verxa Code
        </Link>
      </div>
    );
  }

  const previewFile = files.some((f) => f.path === "index.html")
    ? "index.html"
    : (files.find((f) => f.path.endsWith(".html"))?.path ?? null);
  const diffFiles = files.filter((f) => f.previousContent !== null);
  const viewed = openFile ? files.find((f) => f.path === openFile) ?? null : null;

  return (
    <div className="flex h-dvh overflow-hidden bg-[#07080a] text-white selection:bg-[#10141a]/25 selection:text-white" data-product="code">
      {/* Icon Rail Sidebar */}
      <aside className="hidden w-[54px] shrink-0 flex-col items-center justify-between border-r border-white/[0.08] bg-[#090b10] py-3 md:flex select-none">
        <div className="flex flex-col items-center gap-2">
          <Link
            href="/code"
            title="Back to projects"
            aria-label="Back to projects"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/60 hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft size={17} />
          </Link>
          <Link
            href="/code"
            title="New project"
            aria-label="New project"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#10141a] bg-[#10141a]/10 hover:bg-[#10141a]/20"
          >
            <Plus size={17} />
          </Link>
        </div>

        <div className="flex flex-col items-center gap-2">
          <AccountMenu placement="bottom-left" />
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Workspace Header */}
        <header className="flex h-13 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#090c12] px-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/code" className="text-white/50 hover:text-white md:hidden">
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-[14px] font-semibold text-white">
                  {project?.title ?? "Workspace"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono text-white/50">
                  {project?.status ?? "active"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {liveUrl ? (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 rounded-lg border border-[#10141a]/30 bg-[#10141a]/10 px-3 py-1.5 text-[12px] font-medium text-[#10141a] hover:bg-[#10141a]/20 sm:flex"
              >
                <span>Live Site</span>
                <ExternalLink size={12} />
              </a>
            ) : null}

            <button
              type="button"
              onClick={() => void downloadZip()}
              title="Download ZIP"
              aria-label="Download ZIP"
              className="rounded-lg p-2 text-white/60 hover:bg-white/[0.07] hover:text-white"
            >
              <Download size={15} />
            </button>

            <button
              type="button"
              onClick={() => void pushToGitHub()}
              disabled={pushing}
              title="Push to GitHub"
              aria-label="Push to GitHub"
              className="rounded-lg p-2 text-white/60 hover:bg-white/[0.07] hover:text-white disabled:opacity-40"
            >
              {pushing ? <Loader2 size={15} className="animate-spin" /> : <GitBranch size={15} />}
            </button>

            <button
              type="button"
              onClick={() => void deploy()}
              disabled={deploying}
              title="Deploy to Vercel"
              aria-label="Deploy to Vercel"
              className="flex items-center gap-1.5 rounded-lg bg-[#10141a] px-3 py-1.5 text-[12.5px] font-semibold text-black transition hover:bg-[#171b22] disabled:opacity-40"
            >
              {deploying ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Rocket size={13} strokeWidth={2.5} />
              )}
              <span className="hidden sm:inline">{deploying ? "Deploying…" : "Deploy"}</span>
            </button>
          </div>
        </header>

        {/* Mobile View Switcher */}
        <div className="flex border-b border-white/[0.08] bg-[#0d0f16] md:hidden">
          <button
            type="button"
            onClick={() => setMobileActiveView("preview")}
            className={`flex-1 py-2 text-center text-[13px] font-medium ${
              mobileActiveView === "preview" ? "border-b-2 border-[#10141a] text-white" : "text-white/50"
            }`}
          >
            Preview & Files
          </button>
          <button
            type="button"
            onClick={() => setMobileActiveView("chat")}
            className={`flex-1 py-2 text-center text-[13px] font-medium ${
              mobileActiveView === "chat" ? "border-b-2 border-[#10141a] text-white" : "text-white/50"
            }`}
          >
            AI Agent Chat
          </button>
        </div>

        {/* Center Split: Chat vs Workbench */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Chat Panel */}
          <div
            className={`flex flex-col border-r border-white/[0.08] bg-[#07080a] ${
              panelOpen ? "md:w-[420px] lg:w-[460px]" : "w-full"
            } ${mobileActiveView === "chat" ? "flex" : "hidden md:flex"}`}
          >
            {/* Messages Scroll Area */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              {messages.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#10141a]/10 text-[#10141a]">
                    <Sparkles size={20} />
                  </div>
                  <p className="mt-3 text-[14px] font-medium text-white">Project Initialized</p>
                  <p className="mt-1 text-[13px] text-white/50">
                    Instruct Verxa Code to add components, endpoints, or modify code.
                  </p>
                </div>
              ) : (
                messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-white/[0.08] px-4 py-2.5 text-[13.5px] leading-relaxed text-white">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/40">
                        <VerxaMark size={14} />
                        <span>Verxa Code Agent</span>
                      </div>
                      <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e14] p-4 text-[13.5px] leading-relaxed text-white/85">
                        {m.content || <span className="text-white/35">Working…</span>}
                      </div>
                    </div>
                  ),
                )
              )}

              {/* Status Tree / Active Tool Calls */}
              {agentStatus === "working" || activities.length > 0 || cookedSecs !== null ? (
                <div className="rounded-xl border border-white/[0.08] bg-[#0c0e14] p-3.5 space-y-2 text-[12px]">
                  <div className="flex items-center justify-between text-white/60">
                    <span className="flex items-center gap-1.5">
                      {agentStatus === "working" ? (
                        <>
                          <Loader2 size={13} className="animate-spin text-[#10141a]" />
                          <span className="text-[#10141a] font-medium">{statusText}</span>
                        </>
                      ) : (
                        <>
                          <Check size={13} className="text-white/60" />
                          <span className="text-white/60 font-medium">Finished in {cookedSecs}s</span>
                        </>
                      )}
                    </span>
                    {elapsed > 0 && agentStatus === "working" ? (
                      <span className="font-mono text-white/40">{elapsed}s</span>
                    ) : null}
                  </div>

                  {activities.length > 0 ? (
                    <div className="space-y-1 border-t border-white/[0.06] pt-2 font-mono">
                      {activities.map((a) => (
                        <div key={a.id} className="flex items-center gap-2 text-white/70">
                          {a.done ? (
                            <Check size={12} className="text-[#10141a]" />
                          ) : (
                            <Loader2 size={12} className="animate-spin text-[#10141a]" />
                          )}
                          <span className="truncate">{activityLabel(a.tool, a.path)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            {error ? (
              <div className="mx-4 mb-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-[12.5px] text-red-300">
                {error}
              </div>
            ) : null}

            {/* Input Form */}
            <div className="border-t border-white/[0.08] p-3">
              <div className="rounded-xl border border-white/10 bg-[#0d0f16] shadow-lg transition focus-within:border-[#10141a]/50">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(draft);
                    }
                  }}
                  rows={2}
                  disabled={agentStatus !== "idle"}
                  placeholder="Describe what to add or change…"
                  className="w-full resize-none bg-transparent px-3.5 pt-2.5 text-[13.5px] leading-relaxed text-white placeholder:text-white/40 focus:outline-none disabled:opacity-50"
                />
                <div className="flex items-center justify-between border-t border-white/[0.04] px-3 py-2">
                  <span className="text-[11px] text-white/35 font-mono">Enter to run</span>
                  <button
                    type="button"
                    onClick={() => void send(draft)}
                    disabled={!draft.trim() || agentStatus !== "idle"}
                    aria-label="Send instructions"
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#10141a] text-black transition hover:bg-[#171b22] disabled:opacity-30"
                  >
                    <ArrowUp size={15} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Workbench: Preview / Code Editor / Diff */}
          <div
            className={`min-h-0 flex-1 flex-col bg-[#050608] ${
              mobileActiveView === "preview" ? "flex" : "hidden md:flex"
            }`}
          >
            {/* Workbench Subheader */}
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#090b10] px-3">
              <div className="flex items-center gap-1">
                {(["preview", "files", "diff"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`rounded-lg px-3 py-1 text-[12.5px] font-medium capitalize transition ${
                      tab === t
                        ? "bg-[#10141a]/15 text-[#10141a]"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {t === "files" ? `Files (${files.length})` : t}
                  </button>
                ))}
              </div>

              {tab === "preview" ? (
                <div className="flex items-center gap-1.5">
                  {(["desktop", "tablet", "mobile"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDevice(d)}
                      title={`Preview ${d}`}
                      className={`rounded-md p-1.5 transition ${
                        device === d ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                      }`}
                    >
                      <MonitorSmartphone size={14} />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPreviewKey((k) => k + 1)}
                    title="Refresh preview"
                    className="rounded-md p-1.5 text-white/50 hover:text-white"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              ) : null}
            </div>

            {/* Tab Views */}
            <div className="min-h-0 flex-1 overflow-hidden">
              {/* Preview Tab */}
              {tab === "preview" ? (
                <div className="flex h-full w-full justify-center overflow-auto bg-[#07080a] p-3 sm:p-4">
                  {liveUrl ? (
                    <iframe
                      key={`${liveUrl}-${previewKey}`}
                      title="Live sandbox preview"
                      src={liveUrl}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                      style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }}
                      className="h-full rounded-xl border border-white/10 bg-white"
                    />
                  ) : previewFile ? (
                    <iframe
                      key={`${previewFile}-${previewKey}`}
                      title="Project preview"
                      src={`/api/code/projects/${id}/files/${previewFile}`}
                      sandbox="allow-scripts"
                      style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }}
                      className="h-full rounded-xl border border-white/10 bg-white"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[13.5px] text-white/40">
                      No preview available yet. Submit a prompt to start building.
                    </div>
                  )}
                </div>
              ) : null}

              {/* Files Tab */}
              {tab === "files" ? (
                <div className="flex h-full min-h-0">
                  {/* File List Rail */}
                  <div className="w-56 shrink-0 border-r border-white/[0.08] bg-[#090b10] p-2 overflow-y-auto">
                    <p className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-white/40">Files</p>
                    <div className="space-y-0.5">
                      {files.map((f) => (
                        <button
                          key={f.path}
                          type="button"
                          onClick={() => setOpenFile(f.path)}
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-mono transition ${
                            openFile === f.path
                              ? "bg-[#10141a]/15 text-[#10141a]"
                              : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                          }`}
                        >
                          <FileCode2 size={13} className="shrink-0" />
                          <span className="truncate">{f.path}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Code Viewer */}
                  <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#07080a]">
                    {viewed ? (
                      <>
                        <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0c0e14] px-4">
                          <span className="font-mono text-[12px] text-white/70">{viewed.path}</span>
                          <button
                            type="button"
                            onClick={() => copyCode(viewed.content)}
                            className="flex items-center gap-1 text-[11.5px] text-white/50 hover:text-white"
                          >
                            {copied ? <Check size={12} className="text-[#10141a]" /> : <Copy size={12} />}
                            <span>{copied ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                        <pre className="flex-1 overflow-auto p-4 font-mono text-[12.5px] leading-relaxed text-white/80 select-text">
                          {viewed.content}
                        </pre>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-[13px] text-white/40">
                        Select a file to inspect code.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Diff Tab */}
              {tab === "diff" ? (
                <div className="h-full overflow-y-auto p-4 space-y-4 font-mono text-[12px]">
                  {diffFiles.length === 0 ? (
                    <div className="py-16 text-center text-white/40">
                      No line modifications recorded in this session.
                    </div>
                  ) : (
                    diffFiles.map((f) => (
                      <div key={f.path} className="rounded-xl border border-white/10 bg-[#0c0e14] overflow-hidden">
                        <div className="border-b border-white/[0.08] bg-black/40 px-3 py-2 text-white/60">
                          {f.path}
                        </div>
                        <div className="p-3 leading-relaxed">
                          {diffLines(f.previousContent ?? "", f.content).map((row, i) => (
                            <div
                              key={i}
                              className={
                                row.type === "add"
                                  ? "bg-white/10 text-white/60 px-2 py-0.5"
                                  : row.type === "del"
                                  ? "bg-red-500/10 text-red-300 px-2 py-0.5"
                                  : "text-white/50 px-2 py-0.5"
                              }
                            >
                              <span className="mr-2 inline-block w-3 opacity-60">
                                {row.type === "add" ? "+" : row.type === "del" ? "-" : " "}
                              </span>
                              <span>{row.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Mini Chess easter egg while waiting */}
      {chessOpen ? (
        <div className="fixed bottom-4 left-16 z-50">
          <MiniChess onClose={() => setChessOpen(false)} />
        </div>
      ) : agentStatus === "working" ? (
        <button
          type="button"
          onClick={() => setChessOpen(true)}
          className="fixed bottom-4 left-16 z-40 flex items-center gap-2 rounded-full border border-white/15 bg-[#0f121a] px-3.5 py-1.5 text-[12px] font-medium text-white shadow-xl hover:border-[#10141a]/50"
        >
          <Crown size={13} className="text-amber-400" />
          <span>Play chess while building</span>
        </button>
      ) : null}

      {/* Toast popup */}
      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-white/15 bg-[#0f121a] px-4 py-2 text-[13px] text-white shadow-2xl animate-in fade-in">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
