"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  fetchCloudChats,
  fetchCloudMemories,
  pushCloudChats,
  pushCloudMemories,
  pushCloudPersonalization,
} from "@/lib/db";
import { readJson, removeKey, writeJson } from "@/lib/storage";
import type {
  AccountSettings,
  Chat,
  ConnectedApp,
  LoginEvent,
  MemoryItem,
  Message,
  Personalization,
  SecurityState,
  SessionRecord,
} from "@/lib/types";
import type { MediaAttachment } from "@/lib/types";
import { DEFAULT_MODEL_ID, isKnownModel } from "@/lib/models";
import { titleFromPrompt } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export const GUEST_MESSAGE_LIMIT = 3;

/** When true, brand-new chats route to /mobile/chats/[id] (mobile flow). */
let mobileRouting = false;
export function setMobileChatRouting(on: boolean) {
  mobileRouting = on;
}
export function isMobileChatRouting() {
  return mobileRouting;
}

function readGuestCount() {
  return readJson<number>("guestMessageCount", 0);
}

const defaultSettings: AccountSettings = {
  language: "en",
  theme: "dark",
  notifications: { product: true, security: true, marketing: false },
  emailNotifications: {
    weeklySummary: true,
    chatDigest: false,
    billing: true,
  },
};

const defaultPersonalization: Personalization = {
  customInstructions: "",
  tone: "friendly",
  responseLength: "medium",
  personality: {
    witty: false,
    concise: true,
    curious: true,
    formal: false,
  },
};

const defaultApps: ConnectedApp[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Let Verxa read repositories you choose.",
    connected: false,
    permissions: ["Read public repos"],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Attach docs and sheets from Drive.",
    connected: false,
    permissions: ["Read selected files"],
  },
  {
    id: "notion",
    name: "Notion",
    description: "Search pages you connect.",
    connected: false,
    permissions: ["Read pages"],
  },
];

/** Union-merge local and cloud chats by id; messages dedupe by id. */
function mergeChats(local: Chat[], cloud: Chat[]): Chat[] {
  const map = new Map<string, Chat>();
  for (const c of local) map.set(c.id, { ...c });
  for (const c of cloud) {
    const existing = map.get(c.id);
    if (!existing) {
      map.set(c.id, c);
      continue;
    }
    const byId = new Map(existing.messages.map((m) => [m.id, m]));
    for (const m of c.messages) if (!byId.has(m.id)) byId.set(m.id, m);
    const messages = [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
    map.set(c.id, {
      ...existing,
      title: c.updatedAt > existing.updatedAt ? c.title : existing.title,
      preview: c.updatedAt > existing.updatedAt ? c.preview : existing.preview,
      createdAt: Math.min(existing.createdAt, c.createdAt),
      updatedAt: Math.max(existing.updatedAt, c.updatedAt),
      messages,
    });
  }
  return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

const defaultSessions: SessionRecord[] = [
  {
    id: "current",
    device: "This browser",
    location: "Local session",
    lastActive: "Now",
    current: true,
  },
];

const defaultHistory: LoginEvent[] = [
  {
    id: "1",
    when: "Just now",
    ip: "This device",
    status: "success",
  },
];

type Status = "idle" | "thinking" | "searching" | "reading" | "preparing" | "streaming";

type WorkspaceContextValue = {
  chats: Chat[];
  selectedModelId: string;
  getChatModel: (chatId: string | null) => string;
  setDefaultModel: (id: string) => void;
  setChatModel: (chatId: string, id: string) => void;
  guestMessageCount: number;
  guestLimit: number;
  memories: MemoryItem[];
  settings: AccountSettings;
  personalization: Personalization;
  security: SecurityState;
  apps: ConnectedApp[];
  sessions: SessionRecord[];
  loginHistory: LoginEvent[];
  status: Status;
  streamingChatId: string | null;
  computerUseByChat: Record<string, boolean>;
  pendingComputerUse: boolean;
  getComputerUse: (chatId: string | null) => boolean;
  setComputerUse: (chatId: string | null, on: boolean) => void;
  createChat: (seed?: string) => string;
  renameChat: (id: string, title: string) => void;
  deleteChat: (id: string) => void;
  sendMessage: (
    chatId: string | null,
    content: string,
    mediaMode?: "image" | "video" | null,
    videoOptions?: {
      model: "agnes-video-2.5-flash" | "agnes-video-v2.0";
      seconds: number;
      aspectRatio: string;
    } | null,
  ) => Promise<string>;
  stopGenerating: () => void;
  regenerate: (chatId: string) => void;
  /** Verxa AI (/ai) — same store/account/memory as everything else. */
  aiChats: Chat[];
  isAiChat: (chatId: string) => boolean;
  sendAiMessage: (
    chatId: string | null,
    content: string,
    opts?: { images?: string[] },
  ) => Promise<string>;
  updateSettings: (next: AccountSettings) => void;
  updatePersonalization: (next: Personalization) => void;
  updateSecurity: (next: SecurityState) => void;
  updateApps: (next: ConnectedApp[]) => void;
  addMemory: (content: string) => void;
  updateMemory: (id: string, patch: Partial<MemoryItem>) => void;
  deleteMemory: (id: string) => void;
  clearMemories: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, profile, pendingMessage, consumePendingMessage, requireAuth } =
    useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [settings, setSettings] = useState<AccountSettings>(defaultSettings);
  const [personalization, setPersonalization] = useState<Personalization>(
    defaultPersonalization,
  );
  const [security, setSecurity] = useState<SecurityState>({
    twoFactorEnabled: false,
  });
  const [apps, setApps] = useState<ConnectedApp[]>(defaultApps);
  const [sessions, setSessions] = useState<SessionRecord[]>(defaultSessions);
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>(defaultHistory);
  const [status, setStatus] = useState<Status>("idle");
  const [streamingChatId, setStreamingChatId] = useState<string | null>(null);
  const [modelChoice, setModelChoice] = useState<string | null>(null);
  const [chatModels, setChatModels] = useState<Record<string, string>>({});
  /** IDs of chats owned by the /ai diabetes assistant (shared history). */
  const [aiChatIds, setAiChatIds] = useState<string[]>([]);
  const aiAbortRef = useRef<AbortController | null>(null);
  const [computerUseByChat, setComputerUseByChat] = useState<Record<string, boolean>>({});
  const [pendingComputerUse, setPendingComputerUse] = useState(false);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastSendRef = useRef(0);
  const chatsRef = useRef<Chat[]>([]);
  const syncReadyRef = useRef(false);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const lastPushedRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    // Sweep stale "generating" media cards: if the app was closed/reloaded
    // mid-generation, no poller is alive to finish them — show them as
    // interrupted (with retry hint) instead of an eternal spinner.
    const sweep = (list: Chat[]) =>
      list.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.media?.state === "generating"
            ? {
                ...m,
                media: {
                  ...m.media,
                  state: "error" as const,
                  error: "Generation was interrupted (page closed or reloaded). Send the prompt again to retry.",
                },
              }
            : m,
        ),
      }));
    setChats((prev) => (prev.some((c) => c.messages.some((m) => m.media?.state === "generating")) ? sweep(prev) : prev));
  }, [user?.id]); // re-run on account switch: cloud-loaded chats need the same sweep

  useEffect(() => {
    setMemories(readJson("memories", []));
    setSettings(readJson("settings", defaultSettings));
    setPersonalization(readJson("personalization", defaultPersonalization));
    setSecurity(readJson("security", { twoFactorEnabled: false }));
    setApps(readJson("apps", defaultApps));
    setSessions(readJson("sessions", defaultSessions));
    setLoginHistory(readJson("loginHistory", defaultHistory));
    setModelChoice(readJson<string | null>("model", null));
    setChatModels(readJson<Record<string, string>>("chatModels", {}));
    setAiChatIds(readJson<string[]>("aiChatIds", []));
    setGuestMessageCount(readGuestCount());
  }, []);

  useEffect(() => {
    chatsRef.current = chats;
    writeJson("chats", chats);
  }, [chats]);
  useEffect(() => {
    if (guestMessageCount > 0) writeJson("guestMessageCount", guestMessageCount);
  }, [guestMessageCount]);
  useEffect(() => writeJson("memories", memories), [memories]);
  useEffect(() => writeJson("settings", settings), [settings]);
  useEffect(() => writeJson("personalization", personalization), [personalization]);
  useEffect(() => writeJson("security", security), [security]);
  useEffect(() => writeJson("apps", apps), [apps]);
  useEffect(() => writeJson("model", modelChoice), [modelChoice]);
  useEffect(() => writeJson("chatModels", chatModels), [chatModels]);
  useEffect(() => writeJson("aiChatIds", aiChatIds), [aiChatIds]);

  // --- Cloud sync (signed-in users only; guests stay on localStorage) ---
  useEffect(() => {
    const prev = prevUserIdRef.current;
    prevUserIdRef.current = user?.id ?? null;

    // Sign-out: drop the account's data locally (it lives in the cloud).
    if (!user) {
      if (prev) {
        syncReadyRef.current = false;
        lastPushedRef.current.clear();
        setChats([]);
        setMemories([]);
        removeKey("chats");
        removeKey("memories");
      }
      return;
    }

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      if (!supabase) return;
      try {
        const [cloudChats, cloudMemories] = await Promise.all([
          fetchCloudChats(supabase),
          fetchCloudMemories(supabase),
        ]);
        if (cancelled) return;

        // Union-merge with whatever is on this device (keeps pre-login chats).
        setChats((local) => mergeChats(local, cloudChats));
        setMemories((local) => {
          const byId = new Map(local.map((m) => [m.id, m]));
          for (const m of cloudMemories) if (!byId.has(m.id)) byId.set(m.id, m);
          return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
        });

        syncReadyRef.current = true;
        lastPushedRef.current.clear();
      } catch (error) {
        console.warn("[sync] initial pull failed:", error);
        syncReadyRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
    // Fires on account change (user identity), not on every user object refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Debounced push of chats that changed since the last successful push.
  useEffect(() => {
    if (!user || !syncReadyRef.current) return;
    const t = setTimeout(() => {
      const supabase = createClient();
      if (!supabase) return;
      const changed = chatsRef.current.filter(
        (c) => (lastPushedRef.current.get(c.id) ?? 0) < c.updatedAt,
      );
      if (!changed.length) return;
      pushCloudChats(supabase, user.id, changed)
        .then(() => {
          for (const c of changed) lastPushedRef.current.set(c.id, c.updatedAt);
        })
        .catch((error) => console.warn("[sync] push chats failed:", error));
    }, 1500);
    return () => clearTimeout(t);
  }, [chats, user]);

  // Debounced push of memories.
  useEffect(() => {
    if (!user || !syncReadyRef.current) return;
    const t = setTimeout(() => {
      const supabase = createClient();
      if (!supabase) return;
      pushCloudMemories(supabase, user.id, memories).catch((error) =>
        console.warn("[sync] push memories failed:", error),
      );
    }, 1500);
    return () => clearTimeout(t);
  }, [memories, user]);

  // Debounced push of personalization.
  useEffect(() => {
    if (!user || !syncReadyRef.current) return;
    const t = setTimeout(() => {
      const supabase = createClient();
      if (!supabase) return;
      pushCloudPersonalization(supabase, user.id, personalization).catch((error) =>
        console.warn("[sync] push personalization failed:", error),
      );
    }, 1500);
    return () => clearTimeout(t);
  }, [personalization, user]);

  /** Effective model for a chat: per-chat override → global default → built-in. */
  const getChatModel = useCallback(
    (chatId: string | null) =>
      (chatId ? chatModels[chatId] : undefined) ??
      modelChoice ??
      DEFAULT_MODEL_ID,
    [chatModels, modelChoice],
  );

  const setDefaultModel = useCallback((id: string) => {
    if (!isKnownModel(id)) return;
    setModelChoice(id);
  }, []);

  const setChatModel = useCallback((chatId: string, id: string) => {
    if (!isKnownModel(id)) return;
    setChatModels((prev) => ({ ...prev, [chatId]: id }));
  }, []);

  const createChat = useCallback((seed?: string) => {
    const id = nanoid(10);
    const now = Date.now();
    const chat: Chat = {
      id,
      title: seed ? titleFromPrompt(seed) : "New chat",
      preview: seed ?? "",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    setChats((prev) => [chat, ...prev]);
    return id;
  }, []);

  const renameChat = useCallback((id: string, title: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c)),
    );
  }, []);

  const deleteChat = useCallback((id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setStreamingChatId(null);
  }, []);

  /** Polls an Agnes video task (free provider) until the MP4 URL is ready. */
  const pollAgnesVideo = useCallback(
    (chatId: string, messageId: string, videoId: string, modelName?: string) => {
      let cancelled = false;
      const patch = (media: Message["media"]) =>
        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, media: media ?? undefined } : m,
                  ),
                }
              : c,
          ),
        );
      const tick = async (attempt: number) => {
        if (cancelled) return;
        try {
          const res = await fetch(
            `/api/generate/video?videoId=${encodeURIComponent(videoId)}${modelName ? `&model=${encodeURIComponent(modelName)}` : ""}`,
            {
              cache: "no-store",
            },
          );
          const j = (await res.json()) as {
            state: "running" | "done" | "error";
            url?: string;
            message?: string;
            progress?: number | null;
          };
          if (j.state === "done" && j.url) {
            patch({ kind: "video", prompt: "", state: "done", url: j.url });
            return;
          }
          if (j.state === "error") {
            patch({ kind: "video", prompt: "", state: "error", error: j.message ?? "Video generation failed." });
            return;
          }
          if (attempt < 60) window.setTimeout(() => void tick(attempt + 1), 8000);
          else patch({ kind: "video", prompt: "", state: "error", error: "Video generation timed out. Please try again." });
        } catch {
          if (attempt < 60) window.setTimeout(() => void tick(attempt + 1), 8000);
          else patch({ kind: "video", prompt: "", state: "error", error: "Video generation timed out. Please try again." });
        }
      };
      void tick(0);
      return () => {
        cancelled = true;
      };
    },
    [],
  );

  const pollMedia = useCallback(
    (chatId: string, messageId: string, statusUrl: string, responseUrl: string, kind: "image" | "video" = "image") => {
      let cancelled = false;
      const patch = (media: Message["media"]) =>
        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, media: media ?? undefined } : m,
                  ),
                }
              : c,
          ),
        );
      const tick = async (attempt: number) => {
        if (cancelled) return;
        try {
          const res = await fetch(
            `/api/generate/status?statusUrl=${encodeURIComponent(statusUrl)}&responseUrl=${encodeURIComponent(responseUrl)}`,
            { cache: "no-store" },
          );
          const j = (await res.json()) as {
            state: "running" | "done" | "error";
            url?: string;
            message?: string;
          };
          if (j.state === "done" && j.url) {
            patch({ kind, prompt: "", state: "done", url: j.url });
            return;
          }
          if (j.state === "error") {
            patch({ kind, prompt: "", state: "error", error: j.message ?? "Generation failed." });
            return;
          }
          // running — back off gradually (videos can take minutes)
          window.setTimeout(() => void tick(attempt + 1), Math.min(2000 + attempt * 750, 6000));
        } catch {
          if (attempt < 60) window.setTimeout(() => void tick(attempt + 1), 3000);
          else patch({ kind, prompt: "", state: "error", error: "Generation timed out. Please try again." });
        }
      };
      void tick(0);
      return () => {
        cancelled = true;
      };
    },
    [],
  );

  const runCompletion = useCallback(
    async (
      chatId: string,
      history: Message[],
      mediaMode: "image" | "video" | null = null,
      videoOptions?: {
        model: "agnes-video-2.5-flash" | "agnes-video-v2.0";
        seconds: number;
        aspectRatio: string;
      } | null,
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStreamingChatId(chatId);
      setStatus("thinking");

      const assistantId = nanoid();
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                updatedAt: Date.now(),
                messages: [
                  ...c.messages,
                  {
                    id: assistantId,
                    role: "assistant",
                    content: "",
                    createdAt: Date.now(),
                  },
                ],
              }
            : c,
        ),
      );

      try {
        // Carry the last Flyvia search context so follow-ups like
        // "only direct flights" or "change destination to Paris" re-run it.
        const lastFlights = [...history]
          .reverse()
          .find((m) => m.flights?.offers?.length)?.flights ?? null;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            personalization,
            memories: memories.filter((m) => m.enabled).map((m) => m.content),
            model: getChatModel(chatId),
            flyvia: lastFlights
              ? {
                  origin: lastFlights.origin,
                  destination: lastFlights.destination,
                  departureDate: lastFlights.departureDate,
                  returnDate: lastFlights.returnDate ?? null,
                  passengers: lastFlights.passengers,
                  cabin: lastFlights.cabin,
                }
              : null,
            mediaMode,
            videoOptions: videoOptions ?? undefined,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error("Request failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assembled = "";
        let sources: Message["sources"] = [];

        const patchAssistant = (
          content: string,
          nextSources?: Message["sources"],
          nextSearchUnavailable?: boolean,
        ) => {
          setChats((prev) =>
            prev.map((c) =>
              c.id === chatId
                ? {
                    ...c,
                    preview: content.slice(0, 80) || c.preview,
                    updatedAt: Date.now(),
                    messages: c.messages.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            content,
                            sources: nextSources ?? m.sources,
                            searchUnavailable:
                              nextSearchUnavailable ?? m.searchUnavailable,
                          }
                        : m,
                    ),
                  }
                : c,
            ),
          );
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          let streamDone = false;
          for (const part of parts) {
            const line = part.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            let json: {
              type: string;
              value?: Status;
              text?: string;
              sources?: Message["sources"];
              message?: string;
              flights?: Message["flights"];
              provider?: string;
              reason?: string;
              tool?: string;
              data?: unknown;
              kind?: "image" | "video";
              prompt?: string;
              requestId?: string;
              statusUrl?: string;
              responseUrl?: string;
              agnesVideoId?: string;
              videoModel?: string;
              videoOptions?: MediaAttachment["videoOptions"];
              state?: "generating" | "done" | "error";
              error?: string;
              url?: string;
              mode?: string;
            };
            try {
              json = JSON.parse(line.slice(5).trim());
            } catch {
              continue;
            }
            if (json.type === "done") {
              streamDone = true;
              break;
            }
            if (json.type === "status" && json.value) setStatus(json.value);
            if (json.type === "search_unavailable") {
              patchAssistant(assembled, sources, true);
            }
            if (json.type === "flights" && json.flights) {
              // Attach structured flight results to the assistant message.
              setChats((prev) =>
                prev.map((c) =>
                  c.id === chatId
                    ? {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantId
                            ? { ...m, flights: json.flights }
                            : m,
                        ),
                      }
                    : c,
                ),
              );
            }
            if (json.type === "media" && json.kind) {
              const media: Message["media"] = {
                kind: json.kind,
                prompt: json.prompt ?? "",
                state: json.state ?? "generating",
                url: json.url,
                error: json.error,
                videoOptions: json.videoOptions,
              };
              // No-op guard: re-attaching a "generating" card over a final
              // state (or vice versa) must never regress the UI.
              const prevMedia = chatsRef.current
                .find((c) => c.id === chatId)
                ?.messages.find((m) => m.id === assistantId)?.media;
              if (prevMedia && prevMedia.state !== "generating" && media.state === "generating") {
                // Late "generating" event after a final one — ignore it.
              } else {
                setChats((prev) =>
                  prev.map((c) =>
                    c.id === chatId
                      ? {
                          ...c,
                          messages: c.messages.map((m) =>
                            m.id === assistantId ? { ...m, media } : m,
                          ),
                        }
                      : c,
                  ),
                );
                // Error cards are final; otherwise poll the provider until ready.
                if (media.state === "generating" && json.agnesVideoId) {
                  void pollAgnesVideo(chatId, assistantId, json.agnesVideoId, json.videoModel);
                } else if (media.state === "generating" && json.statusUrl && json.responseUrl) {
                  void pollMedia(chatId, assistantId, json.statusUrl, json.responseUrl, json.kind ?? "image");
                }
              }
            }
            if (json.type === "integration_data") {
              const payload = {
                provider: json.provider ?? "unknown",
                tool: json.tool ?? "unknown",
                data: json.data,
              };
              setChats((prev) =>
                prev.map((c) =>
                  c.id === chatId
                    ? {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantId
                            ? { ...m, integrationData: payload }
                            : m,
                        ),
                      }
                    : c,
                ),
              );
            }
            if (json.type === "connect_prompt") {
              const payload = {
                provider: json.provider ?? "unknown",
                reason: json.reason,
                message: json.message,
              };
              setChats((prev) =>
                prev.map((c) =>
                  c.id === chatId
                    ? {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantId
                            ? { ...m, connectPrompt: payload }
                            : m,
                        ),
                      }
                    : c,
                ),
              );
            }
            if (json.type === "integration_error" && json.message) {
              setChats((prev) =>
                prev.map((c) =>
                  c.id === chatId
                    ? {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantId
                            ? { ...m, integrationError: json.message }
                            : m,
                        ),
                      }
                    : c,
                ),
              );
            }
            if (json.type === "sources") {
              sources = json.sources;
              patchAssistant(assembled, sources);
            }
            if (json.type === "delta" && json.text) {
              setStatus("streaming");
              assembled += json.text;
              patchAssistant(assembled, sources);
            }
            if (json.type === "error") {
              assembled =
                assembled ||
                json.message ||
                "I could not complete that reply.";
              patchAssistant(assembled, sources);
            }
          }
          if (streamDone) {
            try {
              await reader.cancel();
            } catch {
              /* stream already closed */
            }
            break;
          }
        }

        // Stream ended normally: an image card still in "generating" never
        // received its final event (connection dropped / server restarted
        // mid-generation). Finalize it so it can't spin forever. Video cards
        // are excluded — they intentionally keep generating under their own
        // poller after the stream closes.
        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantId &&
                    m.media?.state === "generating" &&
                    m.media.kind === "image"
                      ? {
                          ...m,
                          media: {
                            ...m.media,
                            state: "error" as const,
                            error:
                              "Generation didn't finish — the connection was interrupted. Send the prompt again to retry.",
                          },
                        }
                      : m,
                  ),
                }
              : c,
          ),
        );
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          // Superseded or interrupted stream: finalize any pending media card
          // so it never spins forever. Videos with a live poller keep going;
          // images (sync, in-stream) have no independent poller, so the card
          // is stopped with a retry hint.
          setChats((prev) =>
            prev.map((c) =>
              c.id === chatId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantId && m.media?.state === "generating"
                        ? {
                            ...m,
                            media: {
                              ...m.media,
                              state: "error" as const,
                              error:
                                m.media.kind === "image"
                                  ? "Generation was interrupted. Send the prompt again to retry."
                                  : "Video polling was interrupted — it may still finish on its own.",
                            },
                          }
                        : m,
                    ),
                  }
                : c,
            ),
          );
        } else {
          setChats((prev) =>
            prev.map((c) =>
              c.id === chatId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantId && !m.content
                        ? {
                            ...m,
                            content:
                              "I could not reach the model. Try again in a moment.",
                          }
                        : m,
                    ),
                  }
                : c,
            ),
          );
        }
      } finally {
        setStatus("idle");
        setStreamingChatId(null);
        abortRef.current = null;
      }
    },
    [memories, personalization, getChatModel],
  );

  const sendMessage = useCallback(
    async (
      chatId: string | null,
      content: string,
      mediaMode: "image" | "video" | null = null,
      videoOptions?: {
        model: "agnes-video-2.5-flash" | "agnes-video-v2.0";
        seconds: number;
        aspectRatio: string;
      } | null,
    ) => {
      const text = content.trim();
      if (!text) return chatId ?? "";

      // Debounce accidental double-fires (Enter pressed twice, button spam):
      // the second identical send would abort the first stream and orphan
      // its media card.
      const nowMs = Date.now();
      if (nowMs - lastSendRef.current < 600) return chatId ?? "";
      lastSendRef.current = nowMs;

      // Guest meter: 3 free messages, then the sign-in wall catches the reply.
      if (!user) {
        const count = readGuestCount();
        if (count >= GUEST_MESSAGE_LIMIT) {
          requireAuth({ pendingMessage: text });
          return chatId ?? "";
        }
        setGuestMessageCount(count + 1);
      }

      const now = Date.now();
      const userMsg: Message = {
        id: nanoid(),
        role: "user",
        content: text,
        createdAt: now,
      };

      let id = chatId;
      let history: Message[] = [];

      if (!id) {
        id = nanoid(10);
        const chat: Chat = {
          id,
          title: titleFromPrompt(text),
          preview: text,
          createdAt: now,
          updatedAt: now,
          messages: [userMsg],
        };
        setChats((prev) => [chat, ...prev]);
        history = [userMsg];
        router.push(`${mobileRouting ? "/mobile/chats" : "/chat"}/${id}`);
      } else {
        const existing = chatsRef.current.find((c) => c.id === id);
        history = [...(existing?.messages ?? []), userMsg];
        setChats((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  title:
                    c.messages.length === 0 ? titleFromPrompt(text) : c.title,
                  preview: text,
                  updatedAt: now,
                  messages: [...c.messages, userMsg],
                }
              : c,
          ),
        );
      }

      void runCompletion(id, history, mediaMode, videoOptions);
      return id;
    },
    [router, runCompletion, user, requireAuth],
  );

  useEffect(() => {
    if (!pendingMessage) return;
    const text = consumePendingMessage();
    if (!text) return;
    void sendMessage(null, text);
  }, [pendingMessage, consumePendingMessage, sendMessage]);

  const regenerate = useCallback(
    (chatId: string) => {
      const chat = chatsRef.current.find((c) => c.id === chatId);
      if (!chat) return;
      const withoutLastAssistant =
        chat.messages.at(-1)?.role === "assistant"
          ? chat.messages.slice(0, -1)
          : chat.messages;
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, messages: withoutLastAssistant } : c,
        ),
      );
      void runCompletion(chatId, withoutLastAssistant);
    },
    [runCompletion],
  );

  const addMemory = useCallback((content: string) => {
    if (!content.trim()) return;
    setMemories((prev) => [
      {
        id: nanoid(),
        content: content.trim(),
        enabled: true,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
  }, []);

  const updateMemory = useCallback((id: string, patch: Partial<MemoryItem>) => {
    setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const deleteMemory = useCallback((id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearMemories = useCallback(() => setMemories([]), []);

  const getComputerUse = useCallback(
    (chatId: string | null) => Boolean(chatId && computerUseByChat[chatId]),
    [computerUseByChat],
  );
  const setComputerUse = useCallback((chatId: string | null, on: boolean) => {
    if (chatId) setComputerUseByChat((prev) => ({ ...prev, [chatId]: on }));
    else setPendingComputerUse(on);
  }, []);

  // ---- Verxa AI (/ai diabetes assistant) — shared store ------------------
  // AI chats live in the SAME chats array (same account, same cloud sync,
  // same memories). Only their ids are tagged so /ai/history can list them.
  const isAiChat = useCallback(
    (chatId: string) => aiChatIds.includes(chatId),
    [aiChatIds],
  );

  const aiChats = useMemo(
    () =>
      chats
        .filter((c) => aiChatIds.includes(c.id))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [chats, aiChatIds],
  );

  const runAiCompletion = useCallback(
    async (chatId: string, history: Message[], images?: string[]) => {
      aiAbortRef.current?.abort();
      const controller = new AbortController();
      aiAbortRef.current = controller;
      setStreamingChatId(chatId);
      setStatus("thinking");

      const assistantId = nanoid();
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                updatedAt: Date.now(),
                messages: [
                  ...c.messages,
                  { id: assistantId, role: "assistant", content: "", createdAt: Date.now() },
                ],
              }
            : c,
        ),
      );

      try {
        const lastIdx = history.length - 1;
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history.slice(-20).map((m, i) => ({
              role: m.role,
              content: m.content,
              // Images travel with the newest user message only and are
              // never persisted (keeps localStorage/cloud rows small).
              images:
                i === Math.min(lastIdx, 19) && m.role === "user" ? (images ?? []) : undefined,
            })),
            memories: memories.filter((m) => m.enabled).map((m) => m.content),
          }),
        });
        if (!res.ok || !res.body) throw new Error("Request failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assembled = "";
        const patch = (content: string) =>
          setChats((prev) =>
            prev.map((c) =>
              c.id === chatId
                ? {
                    ...c,
                    preview: content.slice(0, 80) || c.preview,
                    updatedAt: Date.now(),
                    messages: c.messages.map((m) =>
                      m.id === assistantId ? { ...m, content } : m,
                    ),
                  }
                : c,
            ),
          );

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          let streamDone = false;
          for (const part of parts) {
            const line = part.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            let json: {
              type: string;
              value?: Status;
              text?: string;
              message?: string;
            };
            try {
              json = JSON.parse(line.slice(5).trim());
            } catch {
              continue;
            }
            if (json.type === "done") {
              streamDone = true;
              break;
            }
            if (json.type === "status" && json.value) setStatus(json.value);
            if (json.type === "delta" && json.text) {
              setStatus("streaming");
              assembled += json.text;
              patch(assembled);
            }
            if (json.type === "error") {
              assembled = assembled || json.message || "I could not complete that reply.";
              patch(assembled);
            }
          }
          if (streamDone) {
            try {
              await reader.cancel();
            } catch {
              /* stream already closed */
            }
            break;
          }
        }
        if (!assembled) {
          patch("I could not reach the AI. Please try again in a moment.");
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setChats((prev) =>
            prev.map((c) =>
              c.id === chatId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantId && !m.content
                        ? { ...m, content: "I could not reach the AI. Please try again in a moment." }
                        : m,
                    ),
                  }
                : c,
            ),
          );
        }
      } finally {
        setStatus("idle");
        setStreamingChatId(null);
        aiAbortRef.current = null;
      }
    },
    [memories],
  );

  const sendAiMessage = useCallback(
    async (chatId: string | null, content: string, opts?: { images?: string[] }) => {
      const text = content.trim();
      if (!text && !opts?.images?.length) return chatId ?? "";

      if (!user) {
        const count = readGuestCount();
        if (count >= GUEST_MESSAGE_LIMIT) {
          requireAuth({ pendingMessage: text });
          return chatId ?? "";
        }
        setGuestMessageCount(count + 1);
      }

      const now = Date.now();
      const hasPhoto = (opts?.images?.length ?? 0) > 0;
      const userMsg: Message = {
        id: nanoid(),
        role: "user",
        content: hasPhoto ? `${text}${text ? "\n\n" : ""}📷 photo attached` : text,
        createdAt: now,
      };

      let id = chatId;
      let history: Message[] = [];
      if (!id || !chatsRef.current.some((c) => c.id === id)) {
        id = nanoid(10);
        const chat: Chat = {
          id,
          title: `AI · ${titleFromPrompt(text || "Photo analysis")}`,
          preview: text || "Photo analysis",
          createdAt: now,
          updatedAt: now,
          messages: [userMsg],
        };
        setChats((prev) => [chat, ...prev]);
        setAiChatIds((prev) => (prev.includes(id!) ? prev : [id!, ...prev]));
        history = [userMsg];
      } else {
        const existing = chatsRef.current.find((c) => c.id === id);
        history = [...(existing?.messages ?? []), userMsg];
        setChats((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, preview: text || c.preview, updatedAt: now, messages: [...c.messages, userMsg] }
              : c,
          ),
        );
        setAiChatIds((prev) => (prev.includes(id!) ? prev : [id!, ...prev]));
      }

      void runAiCompletion(id, history, opts?.images);
      return id;
    },
    [router, runAiCompletion, user, requireAuth],
  );

  const value = useMemo(
    () => ({
      chats,
      memories,
      selectedModelId: getChatModel(null),
      getChatModel,
      setDefaultModel,
      setChatModel,
      settings,
      personalization,
      security,
      apps,
      sessions,
      loginHistory,
      status,
      streamingChatId,
      computerUseByChat,
      pendingComputerUse,
      getComputerUse,
      setComputerUse,
      guestMessageCount,
      guestLimit: GUEST_MESSAGE_LIMIT,
      createChat,
      renameChat,
      deleteChat,
      sendMessage,
      stopGenerating,
      regenerate,
      aiChats,
      isAiChat,
      sendAiMessage,
      updateSettings: setSettings,
      updatePersonalization: setPersonalization,
      updateSecurity: setSecurity,
      updateApps: setApps,
      addMemory,
      updateMemory,
      deleteMemory,
      clearMemories,
    }),
    [
      chats,
      memories,
      getChatModel,
      setDefaultModel,
      setChatModel,
      settings,
      personalization,
      security,
      apps,
      sessions,
      loginHistory,
      status,
      streamingChatId,
      computerUseByChat,
      pendingComputerUse,
      getComputerUse,
      setComputerUse,
      guestMessageCount,
      createChat,
      renameChat,
      deleteChat,
      sendMessage,
      stopGenerating,
      regenerate,
      aiChats,
      isAiChat,
      sendAiMessage,
      addMemory,
      updateMemory,
      deleteMemory,
      clearMemories,
    ],
  );

  void profile;
  void setSessions;
  void setLoginHistory;

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
