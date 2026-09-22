import AsyncStorage from "@react-native-async-storage/async-storage";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; url: string }[];
  media?: { kind: "image" | "video"; url?: string; state: string; error?: string; prompt?: string };
  createdAt: number;
};

export type Chat = {
  id: string;
  title: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
};

const KEY = "verxa.chats";
const SCOPE_KEY = "verxa.scope";

function scopeKey(): string {
  // Scope is set on sign-in/sign-out by the auth provider.
  return SCOPE_KEY;
}

export async function setChatScope(userId: string | null) {
  const next = userId ?? "guest";
  const prev = await AsyncStorage.getItem(SCOPE_KEY);
  if (prev !== next) {
    // Account switched: keep per-account namespaces.
    await AsyncStorage.setItem(SCOPE_KEY, next);
  }
}

export function id(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export async function loadChats(): Promise<Chat[]> {
  try {
    const scope = await AsyncStorage.getItem(scopeKey());
    const raw = await AsyncStorage.getItem(`${KEY}.${scope ?? "guest"}`);
    return raw ? (JSON.parse(raw) as Chat[]) : [];
  } catch {
    return [];
  }
}

export async function saveChats(chats: Chat[]): Promise<void> {
  try {
    const scope = await AsyncStorage.getItem(scopeKey());
    await AsyncStorage.setItem(`${KEY}.${scope ?? "guest"}`, JSON.stringify(chats));
  } catch {
    /* storage full — non-fatal */
  }
}

export function titleFromPrompt(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 42 ? `${t.slice(0, 42)}…` : t || "New chat";
}
