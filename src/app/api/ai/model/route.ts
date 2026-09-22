import { aiModel } from "@/lib/ai/config";

export const runtime = "nodejs";

/** Public model info for the /ai settings screen — never includes any key. */
export async function GET() {
  return new Response(
    JSON.stringify({
      model: aiModel(),
      gateway: "XKiro",
      capabilities: ["chat", "vision", "tools", "reasoning", "streaming"],
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
