"use client";

/**
 * Barada Studio client library — typed access to the media-library API.
 * All persistence goes through /api/studio (real Supabase storage per user);
 * nothing here fakes data.
 */

export type StudioMode = "generate" | "edit" | "transform" | "image-to-video" | "video";

export type StudioMediaItem = {
  id: string;
  kind: "image" | "video";
  mode: StudioMode;
  prompt: string;
  aspectRatio?: string;
  sourceAssetId?: string;
  parentId?: string;
  url: string;
  createdAt: number;
};

export async function fetchLibrary(): Promise<StudioMediaItem[]> {
  const res = await fetch("/api/studio", { cache: "no-store" });
  if (!res.ok) return [];
  const json = (await res.json().catch(() => ({}))) as { items?: StudioMediaItem[] };
  return json.items ?? [];
}

export async function saveToLibrary(input: {
  kind: "image" | "video";
  mode: StudioMode;
  prompt: string;
  url?: string;
  dataUrl?: string;
  aspectRatio?: string;
  sourceAssetId?: string;
  parentId?: string;
}): Promise<{ item?: StudioMediaItem; error?: string }> {
  const res = await fetch("/api/studio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as { item?: StudioMediaItem; error?: string };
  if (!res.ok) return { error: json.error ?? "Could not save to the library." };
  return { item: json.item };
}

export async function deleteLibraryItem(id: string): Promise<boolean> {
  const res = await fetch("/api/studio/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return res.ok;
}

/** Trigger a real file download for a generated image or video. */
export function downloadMedia(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function extFor(kind: "image" | "video") {
  return kind === "video" ? "mp4" : "png";
}
