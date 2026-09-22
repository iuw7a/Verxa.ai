"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  GitFork,
  Mic,
  MonitorSmartphone,
  Plus,
  Search,
  X,
} from "lucide-react";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/chat/composer";
import { SessionWorkspace, ViewScreenModal } from "@/components/computer-use/workspace";
import { ComputerIntroScreen } from "@/components/computer-use/computer-intro-screen";
import { PermissionDialog } from "@/components/computer-use/permission-dialog";
import {
  controlRun,
  createRun,
  decideConfirmation,
  getConsent,
  getRun,
  isTerminal,
  saveConsent,
  type CuConfirmation,
  type CuConsent,
  type CuEvent,
  type CuRun,
} from "@/lib/computer-use-web";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";

export function ActiveChatScreen({ chatId }: { chatId: string }) {
  const { chats, sendMessage, stopGenerating, regenerate, status, streamingChatId } =
    useWorkspace();
  const chat = chats.find((c) => c.id === chatId);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const [copied, setCopied] = useState(false);
  const [computerUseActive, setComputerUseActive] = useState(false);
  const generating = streamingChatId === chatId && status !== "idle";

  // --- Web-only Computer-Session (kein Desktop, keine Installation) ---
  const { user } = useAuth();
  const [consent, setConsent] = useState<CuConsent | null>(null);
  const [cuRun, setCuRun] = useState<CuRun | null>(null);
  const [cuEvents, setCuEvents] = useState<CuEvent[]>([]);
  const [cuConfirmation, setCuConfirmation] = useState<CuConfirmation | null>(null);
  const [cuBusy, setCuBusy] = useState(false);
  const [cuNotice, setCuNotice] = useState<string | null>(null);
  const [cuDialogOpen, setCuDialogOpen] = useState(false);
  const [cuDialogBusy, setCuDialogBusy] = useState(false);
  const [cuDialogError, setCuDialogError] = useState<string | null>(null);
  const [viewRunId, setViewRunId] = useState<string | null>(null);
  const pendingGoal = useRef<string | null>(null);
  const [prefill, setPrefill] = useState<{ text: string; n: number } | null>(null);
  const prefillN = useRef(0);
  // Follow-up-Panel („Als Computer-Aufgabe fortsetzen") wie in Bild 2.
  const [cuFollowup, setCuFollowup] = useState("");
  const [cuPanelDismissed, setCuPanelDismissed] = useState(false);

  // Consent laden, sobald der Computer-Modus angeht.
  useEffect(() => {
    if (!computerUseActive || !user) return;
    void getConsent().then((res) => {
      if (res.ok) setConsent(res.data.consent);
    });
  }, [computerUseActive, user]);

  // Live-Polling der aktiven Session (Timeline + Freigaben).
  useEffect(() => {
    if (!cuRun) return;
    let dead = false;
    const tick = async () => {
      if (document.hidden) return;
      const res = await getRun(cuRun.id);
      if (dead || !res.ok) return;
      setCuRun(res.data.run);
      setCuEvents(res.data.events);
      setCuConfirmation(res.data.confirmation);
    };
    void tick();
    const t = setInterval(tick, 2000);
    return () => {
      dead = true;
      clearInterval(t);
    };
  }, [cuRun?.id]);

  async function startComputerSession(goal: string) {
    if (!user) {
      setCuNotice("Bitte melde dich an, um Computer Use zu nutzen.");
      return;
    }
    // Noch keine Freigabe → Dialog öffnen, Ziel merken, nach Allow starten.
    if (!consent?.enabled) {
      pendingGoal.current = goal;
      const res = await getConsent();
      if (res.ok) {
        setConsent(res.data.consent);
        if (res.data.consent.enabled) {
          return startComputerSession(goal);
        }
      }
      setCuDialogOpen(true);
      return;
    }
    setCuBusy(true);
    const res = await createRun(goal);
    setCuBusy(false);
    if (!res.ok) {
      setCuNotice(res.error);
      return;
    }
    setCuRun(res.data.run);
    setCuEvents([]);
    setCuConfirmation(null);
    setCuNotice(null);
    setCuPanelDismissed(false);
  }

  async function allowComputerUse() {
    setCuDialogBusy(true);
    setCuDialogError(null);
    const res = await saveConsent({
      enabled: true,
      safe_mode: true,
      screen_access: true,
      mouse_control: true,
      keyboard_control: true,
      app_control: true,
    });
    setCuDialogBusy(false);
    if (!res.ok) {
      setCuDialogError(res.error);
      return;
    }
    setConsent(res.data.consent);
    setCuDialogOpen(false);
    const goal = pendingGoal.current;
    pendingGoal.current = null;
    if (goal) void startComputerSession(goal);
  }

  const handleScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
    stickToBottom.current = nearBottom;
    setAtBottom(nearBottom);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const lastCount = useRef(0);
  useEffect(() => {
    const count = chat?.messages.length ?? 0;
    const isNewMessage = count !== lastCount.current;
    lastCount.current = count;
    if (isNewMessage || stickToBottom.current) {
      scrollToBottom(!isNewMessage);
      if (isNewMessage) stickToBottom.current = true;
    }
  }, [chat?.messages, status, scrollToBottom]);

  useEffect(() => {
    stickToBottom.current = true;
    setAtBottom(true);
    scrollToBottom(false);
  }, [chatId, scrollToBottom]);

  function handleSend(
    value: string,
    mediaMode: "image" | "video" | null,
    videoOptions?: {
      model: "agnes-video-2.5-flash" | "agnes-video-v2.0";
      seconds: number;
      aspectRatio: string;
    } | null,
  ) {
    const text = value.trim();
    // Slash-Befehle nur aus der Chatbar — kein Fullscreen, nur Modus.
    if (/^\/computer\b/i.test(text)) {
      setComputerUseActive(true);
      const rest = text.replace(/^\/computer\b\s*/i, "");
      // Coming soon: kein Direktstart, nur Modus + Hinweis.
      if (rest.length >= 3) {
        setCuNotice("Computer Use kommt bald — volle Web-Sitzungen werden gerade freigeschaltet.");
      }
      return;
    }
    if (/^\/(search|chat|normal)\b/i.test(text)) {
      setComputerUseActive(false);
      const rest = text.replace(/^\/(search|chat|normal)\b\s*/i, "");
      if (!rest) return;
      void sendMessage(chatId, rest, mediaMode, videoOptions);
      return;
    }
    // Computer-Modus ist geparkt (Coming soon) → kein Session-Start,
    // nur Hinweis. Normale Nachrichten laufen weiter.
    if (computerUseActive) {
      setCuNotice("Computer Use kommt bald — volle Web-Sitzungen werden gerade freigeschaltet.");
      return;
    }
    // Nur Chat: keine Browser-Autoöffnung mehr, normale Antwort im Chat.
    void sendMessage(chatId, value, mediaMode, videoOptions);
  }

  async function handleCuControl(action: "stop" | "pause" | "resume") {
    if (!cuRun) return;
    setCuBusy(true);
    const res = await controlRun(cuRun.id, action);
    setCuBusy(false);
    if (!res.ok) {
      setCuNotice(res.error);
      return;
    }
    const detail = await getRun(cuRun.id);
    if (detail.ok) {
      setCuRun(detail.data.run);
      setCuEvents(detail.data.events);
      setCuConfirmation(detail.data.confirmation);
    }
  }

  async function handleCuDecide(allow: boolean) {
    if (!cuRun || !cuConfirmation) return;
    setCuBusy(true);
    const res = await decideConfirmation(cuRun.id, cuConfirmation.id, allow);
    setCuBusy(false);
    if (!res.ok) {
      setCuNotice(res.error);
      return;
    }
    const detail = await getRun(cuRun.id);
    if (detail.ok) {
      setCuRun(detail.data.run);
      setCuEvents(detail.data.events);
      setCuConfirmation(detail.data.confirmation);
    }
  }

  if (!chat) {
    return (
      <div className="flex h-full items-center justify-center text-white/60">
        This chat was not found.
      </div>
    );
  }

return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        ref={scroller}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <MessageList
          messages={chat.messages}
          status={status}
          isStreaming={generating}
          onCopy={async (text) => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          onRegenerate={() => regenerate(chatId)}
          onShare={async () => {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        />
      </div>

      {!atBottom ? (
        <button
          onClick={() => {
            stickToBottom.current = true;
            scrollToBottom();
          }}
          className="absolute right-6 bottom-[220px] z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white/60 shadow-xl transition hover:text-white"
          aria-label="Scroll to latest message"
        >
          <ArrowDown size={16} />
        </button>
      ) : null}

      {/* Docked to the bottom — computer session + composer + live models */}
      <div className="shrink-0 px-6 pt-2 pb-4">
        {generating ? (
          <div className="mb-3 flex justify-center">
            <button
              onClick={stopGenerating}
              className="rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-1.5 text-[12.5px] text-white/70 hover:text-white"
            >
              Stop generating
            </button>
          </div>
        ) : null}
        {computerUseActive && (cuRun || cuNotice || cuBusy) ? (
          <div className="mx-auto mb-3 w-full max-w-[820px]">
            {cuNotice ? (
              <p className="mb-2 rounded-[12px] border border-line bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white/85">
                {cuNotice}
              </p>
            ) : null}
            {cuRun ? (
              <SessionWorkspace
                run={cuRun}
                events={cuEvents}
                confirmation={cuConfirmation}
                deviceName="Web-Sitzung"
                onControl={handleCuControl}
                onDecide={handleCuDecide}
                onViewScreen={() => setViewRunId(cuRun.id)}
                busyAction={cuBusy}
              />
            ) : cuBusy ? (
              <p className="rounded-[12px] border border-line bg-white/[0.02] px-3.5 py-2.5 text-[13px] text-white/60">
                Web-Sitzung wird gestartet…
              </p>
            ) : null}
          </div>
        ) : null}
        {/* Fortsetzen-Panel wie in Bild 2: bei beendeter Session kein
            Dead-End, sondern direkt der nächste Computer-Befehl. */}
        {computerUseActive && cuRun && isTerminal(cuRun.status) && !cuPanelDismissed ? (
          <div className="mx-auto mb-3 w-full max-w-[820px] overflow-hidden rounded-[20px] border border-teal-200/15 bg-[#0d0d12] shadow-[0_0_50px_rgba(45,150,140,0.18)]">
            <div className="flex items-center gap-2 px-4 pt-3">
              <GitFork size={13} className="shrink-0 text-white/50" />
              <p className="flex-1 truncate text-[12.5px] text-white/65">
                Als Computer-Aufgabe fortsetzen für umfassendere Ergebnisse
              </p>
              <button
                type="button"
                aria-label="Schließen"
                onClick={() => setCuPanelDismissed(true)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                <X size={13} />
              </button>
            </div>
            <div className="px-3 pt-2">
              <div className="rounded-[14px] bg-black/50 px-4 pt-3 pb-2">
                <input
                  value={cuFollowup}
                  onChange={(e) => setCuFollowup(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && cuFollowup.trim().length >= 3) {
                      e.preventDefault();
                      const goal = cuFollowup.trim();
                      setCuFollowup("");
                      void startComputerSession(goal);
                    }
                  }}
                  placeholder="Geben Sie einen Befehl ein..."
                  className="w-full bg-transparent text-[14.5px] text-white outline-none placeholder:text-white/35"
                />
                <div className="flex items-center gap-2 pt-2 pb-1">
                  <button
                    type="button"
                    aria-label="Hinzufügen"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
                  >
                    <Plus size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setComputerUseActive(false)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] text-white/55 transition hover:bg-white/[0.07] hover:text-white"
                  >
                    <Search size={13} /> Suche
                  </button>
                  <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[12.5px] text-white">
                    <MonitorSmartphone size={13} /> Computer <ChevronDown size={13} className="text-white/50" />
                  </span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    title="Aufwand"
                    className="flex items-center gap-1 rounded-full px-2 py-1.5 text-[12.5px] text-white/55 transition hover:text-white"
                  >
                    <span className="text-white/35">⁂</span> Leicht <ChevronDown size={13} className="text-white/50" />
                  </button>
                  <button
                    type="button"
                    aria-label="Spracheingabe"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
                  >
                    <Mic size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Senden"
                    disabled={cuFollowup.trim().length < 3}
                    onClick={() => {
                      const goal = cuFollowup.trim();
                      if (goal.length < 3) return;
                      setCuFollowup("");
                      void startComputerSession(goal);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.14] text-white transition hover:bg-white/25 disabled:opacity-30"
                  >
                    <ArrowUp size={16} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            </div>
            <div className="px-4 py-2" />
          </div>
        ) : null}
        <Composer
          variant="dock"
          generating={generating}
          onStop={stopGenerating}
          computerUseActive={computerUseActive}
          onToggleComputerUse={() => setComputerUseActive((v) => !v)}
          onSend={handleSend}
          prefill={prefill}
        />
        {copied ? (
          <p className="mt-2 text-center text-[12px] text-white/60">Copied</p>
        ) : (
          <p className="mt-2 text-center text-[12px] text-white/35">
            Verxa AI · Unique link · /chat/{chatId}
          </p>
        )}
        {computerUseActive && !cuRun && !cuBusy ? (
          <div className="mx-auto mb-3 w-full max-w-[820px]">
            <ComputerIntroScreen
              onSelect={(text) => {
                prefillN.current += 1;
                setPrefill({ text, n: prefillN.current });
              }}
            />
          </div>
        ) : null}
      </div>
      <ViewScreenModal runId={viewRunId} onClose={() => setViewRunId(null)} />
      <PermissionDialog
        open={cuDialogOpen}
        busy={cuDialogBusy}
        error={cuDialogError}
        onAllow={() => void allowComputerUse()}
        onNotNow={() => setCuDialogOpen(false)}
      />
    </div>
  );
}
