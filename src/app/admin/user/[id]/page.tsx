"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock3, Database, Loader2, MessageSquare, Shield, UserRound } from "lucide-react";
import { VerxaWordmark } from "@/components/brand/verxa-mark";
import { Button } from "@/components/ui/primitives";
import { useAuth } from "@/providers/auth-provider";

const ADMIN_EMAILS = ["admin@verxta.de"];

type UserProfile = {
  id: string;
  email?: string | null;
  display_name?: string | null;
  username?: string | null;
  bio?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  plan?: string | null;
  banned?: boolean | null;
  created_at?: string | null;
};

type Memory = { id: string; content: string; enabled: boolean; created_at: string };
type Chat = { id: string; title: string; updated_at: string };
type Personalization = {
  tone?: string | null;
  response_length?: string | null;
  custom_instructions?: string | null;
};

type UserData = {
  profile: UserProfile | null;
  memories: Memory[];
  personalization: Personalization | null;
  chats: Chat[];
};

export default function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = Boolean(user && ADMIN_EMAILS.includes((user.email ?? "").toLowerCase()));

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/admin/users?userId=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as UserData & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Could not load this user.");
        if (!cancelled) setData(json);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load this user.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isAdmin]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#07080a] text-white/60">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#07080a] p-6 text-center text-white">
        <Shield size={26} className="text-white/50" />
        <p>Dieser Bereich ist nur für Administratoren verfügbar.</p>
        {user ? <Button variant="subtle" onClick={() => router.push("/logout")}>Abmelden</Button> : null}
      </div>
    );
  }

  const profile = data?.profile;
  const displayName = profile?.display_name || profile?.username || profile?.email || id;

  return (
    <div className="admin-console min-h-dvh bg-[#07080a] text-[#f2f2f4]">
      <div className="flex min-h-dvh">
        <aside className="hidden w-[252px] shrink-0 flex-col border-r border-white/[0.08] bg-[#090a0d] lg:flex">
          <div className="border-b border-white/[0.08] px-5 py-5">
            <Link href="/admin" className="inline-flex"><VerxaWordmark /></Link>
            <p className="mt-5 text-[10px] font-medium tracking-[0.18em] text-white/30 uppercase">User workspace</p>
          </div>
          <nav className="space-y-1 px-3 py-4">
            <Link href="/admin" className="flex h-10 items-center gap-3 rounded-[11px] px-3 text-[13.5px] text-white/55 transition hover:bg-white/[0.045] hover:text-white">
              <ArrowLeft size={16} /> Back to admin
            </Link>
            <div className="flex h-10 items-center gap-3 rounded-[11px] bg-white/[0.09] px-3 text-[13.5px] text-white">
              <UserRound size={16} /> User data
            </div>
          </nav>
          <div className="mt-auto border-t border-white/[0.08] p-3">
            <p className="truncate text-[12px] text-white/45">{user.email}</p>
            <Button variant="ghost" size="sm" onClick={() => router.push("/logout")} className="mt-2 w-full justify-start text-white/50 hover:text-white">Sign out</Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#07080a]/90 backdrop-blur-xl">
            <div className="flex min-h-[72px] items-center justify-between gap-4 px-5 sm:px-8">
              <div className="min-w-0">
                <Link href="/admin" className="mb-1 inline-flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white"><ArrowLeft size={12} /> Admin dashboard</Link>
                <h1 className="truncate text-[20px] font-medium tracking-[-0.03em]">{displayName}</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-white/40 sm:inline-flex">{id}</span>
                <Link href={`/admin/user/${encodeURIComponent(id)}/data`} className="rounded-[10px] border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white/65 transition hover:bg-white/[0.08] hover:text-white">Data view</Link>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1280px] px-5 py-6 sm:px-8 sm:py-8">
            {error ? <div className="rounded-[13px] border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] text-white/70">{error}</div> : null}
            {!error && !data ? <div className="rounded-[13px] border border-dashed border-white/15 p-8 text-center text-white/45">User not found.</div> : null}
            {data ? (
              <>
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[14px] border border-white/[0.08] bg-white/[0.025] p-5">
                    <p className="text-[10px] tracking-[0.14em] text-white/35 uppercase">Account</p>
                    <p className="mt-2 truncate text-[15px] text-white/85">{profile?.email || "—"}</p>
                    <p className="mt-1 text-[12px] text-white/40">{profile?.created_at ? `Joined ${new Date(profile.created_at).toLocaleDateString()}` : "No join date"}</p>
                  </div>
                  <div className="rounded-[14px] border border-white/[0.08] bg-white/[0.025] p-5">
                    <p className="text-[10px] tracking-[0.14em] text-white/35 uppercase">Plan</p>
                    <p className="mt-2 text-[20px] font-medium capitalize">{profile?.plan || "free"}</p>
                    <p className="mt-1 text-[12px] text-white/40">Subscription state</p>
                  </div>
                  <div className="rounded-[14px] border border-white/[0.08] bg-white/[0.025] p-5">
                    <p className="text-[10px] tracking-[0.14em] text-white/35 uppercase">Status</p>
                    <p className="mt-2 flex items-center gap-2 text-[20px] font-medium"><span className={`h-2 w-2 rounded-full ${profile?.banned ? "bg-white/30" : "bg-white/70"}`} />{profile?.banned ? "Banned" : "Active"}</p>
                    <p className="mt-1 text-[12px] text-white/40">Access status</p>
                  </div>
                  <div className="rounded-[14px] border border-white/[0.08] bg-white/[0.025] p-5">
                    <p className="text-[10px] tracking-[0.14em] text-white/35 uppercase">Stored data</p>
                    <p className="mt-2 text-[20px] font-medium">{data.memories.length + data.chats.length}</p>
                    <p className="mt-1 text-[12px] text-white/40">{data.memories.length} memories · {data.chats.length} chats</p>
                  </div>
                </section>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <section className="rounded-[14px] border border-white/[0.08] bg-white/[0.025]">
                    <div className="border-b border-white/[0.08] px-5 py-4"><h2 className="flex items-center gap-2 text-[15px] font-medium"><UserRound size={15} /> Profile &amp; personalization</h2></div>
                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                      {[
                        ["Display name", profile?.display_name || "—"],
                        ["Username", profile?.username || "—"],
                        ["Location", profile?.location || "—"],
                        ["Tone", data.personalization?.tone || "Default"],
                        ["Response length", data.personalization?.response_length || "Default"],
                        ["Bio", profile?.bio || "—"],
                      ].map(([label, value]) => <div key={label}><p className="text-[10px] tracking-[0.12em] text-white/35 uppercase">{label}</p><p className="mt-1 text-[13px] leading-relaxed text-white/75">{value}</p></div>)}
                      <div className="sm:col-span-2"><p className="text-[10px] tracking-[0.12em] text-white/35 uppercase">Custom instructions</p><p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-white/65">{data.personalization?.custom_instructions || "No custom instructions."}</p></div>
                    </div>
                  </section>

                  <section className="rounded-[14px] border border-white/[0.08] bg-white/[0.025]">
                    <div className="border-b border-white/[0.08] px-5 py-4"><h2 className="flex items-center gap-2 text-[15px] font-medium"><Database size={15} /> Memories</h2></div>
                    <div className="max-h-[330px] space-y-2 overflow-y-auto p-5">
                      {data.memories.length ? data.memories.map((memory) => <div key={memory.id} className="rounded-[11px] border border-white/[0.07] bg-black/20 p-3"><div className="flex items-center justify-between gap-3"><span className="text-[10px] text-white/35">{new Date(memory.created_at).toLocaleDateString()}</span><span className="flex items-center gap-1 text-[10px] text-white/45">{memory.enabled ? <Check size={11} /> : null}{memory.enabled ? "Enabled" : "Disabled"}</span></div><p className="mt-2 text-[12.5px] leading-relaxed text-white/70">{memory.content}</p></div>) : <p className="py-8 text-center text-[13px] text-white/40">No memories stored.</p>}
                    </div>
                  </section>
                </div>

                <section className="mt-5 rounded-[14px] border border-white/[0.08] bg-white/[0.025]">
                  <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4"><h2 className="flex items-center gap-2 text-[15px] font-medium"><MessageSquare size={15} /> Recent chats</h2><span className="text-[11px] text-white/35">{data.chats.length} loaded</span></div>
                  <div className="divide-y divide-white/[0.07]">
                    {data.chats.length ? data.chats.map((chat) => <Link key={chat.id} href={`/admin?tab=chats&chatId=${encodeURIComponent(chat.id)}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.04]"><MessageSquare size={14} className="shrink-0 text-white/35" /><span className="min-w-0 flex-1 truncate text-[13px] text-white/75">{chat.title || "Untitled chat"}</span><span className="flex shrink-0 items-center gap-1 text-[11px] text-white/35"><Clock3 size={12} />{new Date(chat.updated_at).toLocaleDateString()}</span></Link>) : <p className="px-5 py-8 text-center text-[13px] text-white/40">No chats found.</p>}
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
