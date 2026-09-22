import { MarketingShell } from "@/components/marketing/shell";

export const metadata = { title: "Terms · Verxa AI" };

export default function TermsPage() {
  return (
    <MarketingShell>
      <h1 className="text-[34px] font-light tracking-[-0.045em]">
        Terms of Service
      </h1>
      <p className="mt-2 text-[13px] text-faint">
        Last updated: September 2026 · Berlin, Germany
      </p>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-muted">
        <section>
          <h2 className="text-[20px] font-medium text-ink">1. The service</h2>
          <p className="mt-2">
            Verxa AI provides access to AI language models and live web search.
            The service is provided &ldquo;as is&rdquo;. AI output can be wrong
            — verify important information independently.
          </p>
        </section>
        <section>
          <h2 className="text-[20px] font-medium text-ink">2. Accounts</h2>
          <p className="mt-2">
            Guests can send a limited number of messages. You are responsible
            for the activity on your account and for keeping your credentials
            safe.
          </p>
        </section>
        <section>
          <h2 className="text-[20px] font-medium text-ink">3. Acceptable use</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>No illegal content, harassment, or attempts to harm the service.</li>
            <li>No automated scraping or abuse of the API without agreement.</li>
            <li>
              Don&apos;t use Verxa to generate content that violates applicable
              law or third-party rights.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-[20px] font-medium text-ink">4. Content</h2>
          <p className="mt-2">
            You keep the rights to what you write. We may use anonymized usage
            patterns to improve the service. Generated content carries no
            warranty of accuracy or fitness for a particular purpose.
          </p>
        </section>
        <section>
          <h2 className="text-[20px] font-medium text-ink">5. Liability</h2>
          <p className="mt-2">
            To the extent permitted by law, Verxa AI is not liable for indirect
            or consequential damages arising from use of the service.
          </p>
        </section>
      </div>
    </MarketingShell>
  );
}
