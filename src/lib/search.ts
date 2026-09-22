export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

function parseResults(data: unknown): SearchResult[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;

  const tavily = obj.results;
  if (Array.isArray(tavily)) {
    return tavily
      .map((item) => {
        const r = item as Record<string, unknown>;
        return {
          title: String(r.title ?? r.name ?? "Source"),
          url: String(r.url ?? r.link ?? ""),
          snippet: String(r.content ?? r.snippet ?? r.summary ?? ""),
        };
      })
      .filter((r) => r.url)
      .slice(0, 6);
  }

  const dataArr = obj.data;
  if (Array.isArray(dataArr)) {
    return dataArr
      .map((item) => {
        const r = item as Record<string, unknown>;
        return {
          title: String(r.title ?? r.name ?? "Source"),
          url: String(r.url ?? r.link ?? ""),
          snippet: String(r.snippet ?? r.summary ?? r.content ?? ""),
        };
      })
      .filter((r) => r.url)
      .slice(0, 6);
  }

  const webPages = (obj.webPages as { value?: unknown[] } | undefined)?.value;
  if (Array.isArray(webPages)) {
    return webPages
      .map((item) => {
        const r = item as Record<string, unknown>;
        // LangSearch ships a long `summary` plus a short `snippet` —
        // prefer the summary so the model gets real context.
        const text = String(r.summary ?? r.snippet ?? r.content ?? "");
        return {
          title: String(r.name ?? r.title ?? "Source"),
          url: String(r.url ?? ""),
          snippet: text.slice(0, 1200),
        };
      })
      .filter((r) => r.url)
      .slice(0, 6);
  }

  return [];
}

async function serpApiSearch(query: string, key: string): Promise<SearchResult[]> {
  const url = new URL("https://serpapi.com/search");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("google_domain", "google.com");
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", "us");
  url.searchParams.set("api_key", key);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      console.error(`[search] SerpApi failed: HTTP ${res.status}`);
      return [];
    }
    const json = (await res.json().catch(() => null)) as {
      organic_results?: {
        title?: unknown;
        link?: unknown;
        snippet?: unknown;
      }[];
    } | null;
    return (json?.organic_results ?? [])
      .map((r) => ({
        title: String(r.title ?? "Source"),
        url: String(r.link ?? ""),
        snippet: String(r.snippet ?? ""),
      }))
      .filter((r) => r.url)
      .slice(0, 6);
  } catch (error) {
    console.error("[search] SerpApi request failed:", error);
    return [];
  }
}

async function tryFetch(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false as const, json };
  }
  return { ok: true as const, json };
}

/**
 * LangSearch (https://langsearch.com) — primary web search provider.
 * POST /v1/web-search with Bearer key. Response nests results under
 * `data.webPages.value` (Bing-compatible entries: name/url/snippet/summary).
 */
async function langsearchSearch(
  query: string,
  key: string,
): Promise<SearchResult[]> {
  try {
    const { ok, json } = await tryFetch(
      "https://api.langsearch.com/v1/web-search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key.trim()}`,
        },
        body: JSON.stringify({
          query,
          freshness: "noLimit",
          summary: true,
          count: 8,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!ok) {
      console.error(
        `[search] LangSearch failed: ${JSON.stringify(json)?.slice(0, 160)}`,
      );
      return [];
    }
    // Unwrap the `data` envelope, then parse Bing-style webPages.
    const data = (json as { data?: unknown } | null)?.data ?? json;
    const parsed = parseResults(data);
    if (parsed.length) return parsed;
    return parseResults(json);
  } catch (error) {
    console.error("[search] LangSearch request failed:", error);
    return [];
  }
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  // Primary: LangSearch (dedicated key, falls back to the generic one).
  const langKey =
    process.env.LANGSEARCH_API_KEY?.trim() ||
    process.env.WEB_SEARCH_API_KEY?.trim();
  if (langKey) {
    const results = await langsearchSearch(query, langKey);
    if (results.length) return results;
  }

  // Fallback: SerpApi (Google engine).
  const serpApiKey = process.env.SERPAPI_API_KEY?.trim();
  if (serpApiKey) {
    const serpResults = await serpApiSearch(query, serpApiKey);
    if (serpResults.length) return serpResults;
  }

  if (!langKey && !serpApiKey) {
    console.warn(
      "[search] No search provider configured — set LANGSEARCH_API_KEY in .env.local and restart the dev server.",
    );
  }
  return [];
}
