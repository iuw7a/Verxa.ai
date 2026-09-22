import { MarketingShell } from "@/components/marketing/shell";

export const metadata = { title: "Privacy · Verxa AI" };

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <h1 className="text-[34px] font-light tracking-[-0.045em]">
        Privacy Policy
      </h1>
      <p className="mt-2 text-[13px] text-faint">
        Last updated: September 2026 · Berlin, Germany
      </p>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-muted">
        <section>
          <h2 className="text-[20px] font-medium text-ink">Data we store</h2>
          <p className="mt-2">
            <strong className="text-ink">Guests:</strong> your conversations
            and settings remain in your browser&apos;s local storage. They
            never leave your device until you send a message.
          </p>
          <p className="mt-2">
            <strong className="text-ink">Signed-in users:</strong> your email,
            profile, conversations, and memories are stored in our Supabase
            database, scoped to your account and protected by row-level
            security — no other user can read them.
          </p>
        </section>

        <section>
          <h2 className="text-[20px] font-medium text-ink">
            Third parties we rely on
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong className="text-ink">Supabase</strong> — authentication
              and database (EU-hosted).
            </li>
            <li>
              <strong className="text-ink">NVIDIA</strong> — AI model
              inference. Your messages are processed to generate replies.
            </li>
            <li>
              <strong className="text-ink">SerpApi / Google</strong> — live web
              search results for current-topic questions.
            </li>
          </ul>
          <p className="mt-2">
            Messages you send are transmitted to the model provider to produce
            a response. Do not share secrets you wouldn&apos;t share with any
            cloud AI service.
          </p>
        </section>

        <section>
          <h2 className="text-[20px] font-medium text-ink">Your rights (GDPR)</h2>
          <p className="mt-2">
            You can export or delete your data at any time: deleting a chat
            removes it, and deleting your account removes all associated rows.
            For requests, contact us via the{" "}
            <a href="/support" className="text-accent hover:underline">
              support page
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-[20px] font-medium text-ink">Cookies</h2>
          <p className="mt-2">
            We use one essential cookie set for keeping you signed in
            (Supabase auth session). No advertising or tracking cookies.
          </p>
        </section>
      </div>
    </MarketingShell>
  );
}
