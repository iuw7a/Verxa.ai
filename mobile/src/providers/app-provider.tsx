import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import {
  loadChats,
  saveChats,
  setChatScope,
  titleFromPrompt,
  id as newId,
  type Chat,
  type ChatMessage,
} from "@/lib/store";
import { streamChat, fetchProfile, type ChatEvent, type Profile } from "@/lib/api";
import { fetchCloudChats, pushCloudChats, mergeChats } from "@/lib/cloud";

export type GenMode = "chat" | "image" | "video" | "tools";

type AppContextValue = {
  session: { userId: string | null; email: string | null } | null;
  authLoading: boolean;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  chats: Chat[];
  streaming: boolean;
  genMode: GenMode;
  setGenMode: (m: GenMode) => void;
  send: (text: string) => Promise<void>;
  stop: () => void;
  newChat: () => string;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, title: string) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<{ userId: string | null; email: string | null } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [genMode, setGenMode] = useState<GenMode>("chat");
  const abortRef = useRef<AbortController | null>(null);
  const chatsRef = useRef<Chat[]>([]);
  chatsRef.current = chats;

  // Auth session bootstrap.
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setSession(s ? { userId: s.user.id, email: s.user.email ?? null } : null);
      setChatScope(s?.user.id ?? null).then(() => loadChats().then(setChats));
      if (s) void fetchProfile().then(setProfile);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ? { userId: s.user.id, email: s.user.email ?? null } : null);
      setChatScope(s?.user.id ?? null).then(() => loadChats().then(setChats));
      if (s) void fetchProfile().then(setProfile);
      else setProfile(null);
    });
    // Pull cloud history once on mount (same tables as verxa.de).
    void fetchCloudChats()
      .then((cloud) => {
        if (cloud.length > 0) {
          setChats((prev) => {
            const merged = mergeChats(prev, cloud);
            void saveChats(merged);
            return merged;
          });
        }
      })
      .catch(() => null);
    return () => sub.subscription.unsubscribe();
  }, []);

  const persist = useCallback((next: Chat[]) => {
    setChats(next);
    void saveChats(next);
    // Fire-and-forget push to the same cloud storage the web app uses.
    void pushCloudChats(next.filter((c) => c.messages.length > 0)).catch(() => null);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Supabase not configured.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Supabase not configured.";
    const { error } = await supabase.auth.signUp({ email, password });
    return error ? error.message : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setSession(null);
    setProfile(null);
    await setChatScope(null);
    setChats([]);
  }, []);

  const newChat = useCallback(() => {
    const chat: Chat = {
      id: newId(),
      title: "New chat",
      preview: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    persist([chat, ...chatsRef.current.filter((c) => c.messages.length > 0)]);
    return chat.id;
  }, [persist]);

  const deleteChat = useCallback(
    (chatId: string) => {
      persist(chatsRef.current.filter((c) => c.id !== chatId));
    },
    [persist],
  );

  const renameChat = useCallback(
    (chatId: string, title: string) => {
      persist(chatsRef.current.map((c) => (c.id === chatId ? { ...c, title } : c)));
    },
    [persist],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || streaming) return;

      // Reuse the newest empty chat or create one.
      let chat = chatsRef.current.find((c) => c.messages.length === 0);
      let list: Chat[];
      if (!chat) {
        chat = {
          id: newId(),
          title: titleFromPrompt(content),
          preview: content,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        };
        list = [chat, ...chatsRef.current];
      } else {
        list = chatsRef.current;
      }

      const userMsg: ChatMessage = {
        id: newId(),
        role: "user",
        content,
        createdAt: Date.now(),
      };
      const assistantId = newId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };

      const history = [...chat.messages, userMsg];
      const updatedList = list.map((c) =>
        c.id === chat!.id
          ? {
              ...c,
              title: c.messages.length === 0 ? titleFromPrompt(content) : c.title,
              preview: content,
              updatedAt: Date.now(),
              messages: [...c.messages, userMsg, assistantMsg],
            }
          : c,
      );
      persist(updatedList);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const patch = (chatId: string, msgId: string, patchMsg: Partial<ChatMessage>) => {
        setChats((prev) => {
          const next = prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patchMsg } : m)),
                }
              : c,
          );
          void saveChats(next);
          return next;
        });
      };

      try {
        let assembled = "";
        await streamChat(
          {
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            mediaMode: genMode === "image" ? "image" : genMode === "video" ? "video" : null,
            enableSearch: genMode !== "tools",
          },
          (e: ChatEvent) => {
            if (e.type === "delta") {
              assembled += e.text;
              patch(chat!.id, assistantId, { content: assembled });
            } else if (e.type === "sources") {
              patch(chat!.id, assistantId, { sources: e.sources });
            } else if (e.type === "media") {
              patch(chat!.id, assistantId, {
                media: { kind: e.kind, state: e.state, url: e.url, error: e.error, prompt: e.prompt },
              });
            } else if (e.type === "error") {
              patch(chat!.id, assistantId, {
                content: assembled || e.message || "Something went wrong.",
              });
            }
          },
          controller.signal,
        );
      } catch (err) {
        const name = (err as Error).name;
        if (name !== "AbortError") {
          patch(chat.id, assistantId, {
            content: (err as Error).message || "Could not reach the server. Try again.",
          });
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [genMode, persist, streaming],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      authLoading,
      profile,
      signIn,
      signUp,
      signOut,
      chats,
      streaming,
      genMode,
      setGenMode,
      send,
      stop,
      newChat,
      deleteChat,
      renameChat,
    }),
    [session, authLoading, profile, signIn, signUp, signOut, chats, streaming, genMode, send, stop, newChat, deleteChat, renameChat],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
