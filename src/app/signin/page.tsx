import { redirect } from "next/navigation";

/** Alias: /signin behaves exactly like /login (keeps ?next= and ?mode=). */
export default async function SigninAlias({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") q.set(k, v);
  }
  const suffix = q.toString() ? `?${q.toString()}` : "";
  redirect(`/login${suffix}`);
}
