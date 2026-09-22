/**
 * Chat models across both providers:
 * - xKiro gateway (https://api.xkiro.com/v1): 37 `free`-tier models, usable
 *   with the configured key (500k free tokens/day).
 * - NVIDIA Build (https://integrate.api.nvidia.com/v1): models verified
 *   live with real completions against the configured key.
 * The live list is served by /api/models and rendered at the bottom
 * of the chat page. `provider` decides which gateway serves a request.
 */
export type ModelProvider = "xkiro" | "nvidia";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
  badge?: string;
  provider: ModelProvider;
};

const xkiro = (
  id: string,
  name: string,
  description: string,
  badge?: string,
): ChatModel => ({ id, name, description, badge, provider: "xkiro" });

const nvidia = (
  id: string,
  name: string,
  description: string,
  badge?: string,
): ChatModel => ({ id, name, description, badge, provider: "nvidia" });

export const CHAT_MODELS: ChatModel[] = [
  // ---- NVIDIA (verified live) ----
  nvidia("openai/gpt-oss-20b", "GPT-OSS 20B", "Best all-rounder — fast and capable", "Default"),
  nvidia("google/gemma-4-31b-it", "Gemma 4 31B", "Strong chat quality, quick responses"),
  nvidia("meta/llama-3.2-11b-vision-instruct", "Llama 3.2 11B Vision", "Chat with image understanding", "Vision"),
  nvidia("nvidia/nemotron-3-super-120b-a12b", "Nemotron 3 Super", "Largest quality, a bit slower"),
  nvidia("nvidia/nemotron-3.5-lightning-30b-a3b", "Nemotron Lightning", "Optimized for speed", "Fast"),
  // ---- xKiro free tier ----
  xkiro("mistralai/mistral-small-2603", "Mistral Small 4", "Best all-rounder — fast, vision + tools", "Default"),
  xkiro("mistralai/mistral-large-2512", "Mistral Large 3", "Largest Mistral quality, vision", "Strong"),
  xkiro("mistralai/mistral-medium-3.5", "Mistral Medium 3.5", "Balanced quality and speed, vision"),
  xkiro("mistralai/ministral-8b", "Ministral 8B", "Small and quick, vision", "Fast"),
  xkiro("mistralai/ministral-14b", "Ministral 14B", "Compact quality, vision"),
  xkiro("mistralai/ministral-3b", "Ministral 3B", "Tiny and fastest, vision"),
  xkiro("mistralai/codestral-2508", "Codestral", "Tuned for code", "Code"),
  xkiro("mistralai/devstral-medium", "Devstral 2", "Agentic coding"),
  xkiro("qwen/qwen3-max:free", "Qwen3 Max (Free)", "Flagship Qwen, vision + tools"),
  xkiro("qwen/qwen3.8-max:free", "Qwen3.8 Max (Free)", "Newest max quality, vision"),
  xkiro("qwen/qwen3.7-max:free", "Qwen3.7 Max (Free)", "Max reasoning power"),
  xkiro("qwen/qwen3.7-plus:free", "Qwen3.7 Plus (Free)", "Strong plus tier, vision"),
  xkiro("qwen/qwen3.6-plus:free", "Qwen3.6 Plus (Free)", "Solid plus quality, vision"),
  xkiro("qwen/qwen3.5-plus:free", "Qwen3.5 Plus (Free)", "Reliable plus, vision"),
  xkiro("qwen/qwen3.7-flash:free", "Qwen3.7 Flash (Free)", "Fast flash generation, vision", "Fast"),
  xkiro("qwen/qwen3.5-flash:free", "Qwen3.5 Flash (Free)", "Quick responses, vision"),
  xkiro("qwen/qwen3.8-omni-flash:free", "Qwen3.8 Omni Flash (Free)", "Omni multimodal, vision", "Vision"),
  xkiro("qwen/qwen3.5-omni-flash:free", "Qwen3.5 Omni Flash (Free)", "Omni multimodal, vision"),
  xkiro("qwen/qwen3.5-omni-plus:free", "Qwen3.5 Omni Plus (Free)", "Omni plus quality, vision"),
  xkiro("qwen/qwen3-omni-flash:free", "Qwen3 Omni Flash (Free)", "Omni flash, vision"),
  xkiro("qwen/qwen3-vl-plus:free", "Qwen3 VL Plus (Free)", "Vision-language plus", "Vision"),
  xkiro("qwen/qwen3-coder-plus:free", "Qwen3 Coder Plus (Free)", "Code specialist, vision", "Code"),
  xkiro("qwen/qwen-plus-2025-07-28:free", "Qwen Plus 0728 (Free)", "Stable plus snapshot, vision"),
  xkiro("qwen/qwen3.6-27b:free", "Qwen3.6 27B (Free)", "Mid-size quality, vision"),
  xkiro("qwen/qwen3.6-35b-a3b:free", "Qwen3.6 35B A3B (Free)", "MoE efficiency, vision"),
  xkiro("qwen/qwen3.6-max-preview:free", "Qwen3.6 Max Preview (Free)", "Preview max quality"),
  xkiro("qwen/qwen3.5-397b-a17b:free", "Qwen3.5 397B (Free)", "Giant MoE, vision"),
  xkiro("minimax/minimax-m3:free", "MiniMax M3 (Free)", "New MiniMax flagship, vision"),
  xkiro("minimax/minimax-m2.7:free", "MiniMax M2.7 (Free)", "Agentic MiniMax"),
  xkiro("minimax/minimax-m2.7-highspeed:free", "M2.7 Highspeed (Free)", "Fastest MiniMax", "Fast"),
  xkiro("minimax/minimax-m2.5:free", "MiniMax M2.5 (Free)", "Balanced agent model"),
  xkiro("minimax/minimax-m2.5-highspeed:free", "M2.5 Highspeed (Free)", "Speed-tuned agent"),
  xkiro("minimax/minimax-m2:free", "MiniMax M2 (Free)", "Classic agent model"),
  xkiro("minimax/minimax-m2.1:free", "MiniMax M2.1 (Free)", "Stable agent"),
  xkiro("minimax/minimax-m2.1-highspeed:free", "M2.1 Highspeed (Free)", "Fast agent"),
  xkiro("sensenova/sensenova-6.8-flash-lite", "SenseNova 6.8 Flash-Lite", "Ultra-light flash, vision", "Fast"),
  xkiro("sensenova/sensenova-6.7-flash-lite", "SenseNova 6.7 Flash-Lite", "Light flash, vision"),
];

export const DEFAULT_MODEL_ID = "openai/gpt-oss-20b";

export function isKnownModel(id: string): boolean {
  if (CHAT_MODELS.some((m) => m.id === id)) return true;
  // Live catalogs rotate — any provider/model id shape is accepted
  // so the bottom model bar stays selectable even for new models.
  return typeof id === "string" && id.includes("/") && id.length < 120;
}

export function getModel(id: string): ChatModel | undefined {
  return CHAT_MODELS.find((m) => m.id === id);
}

/** Which gateway serves this model. Unknown ids default to xKiro. */
export function providerForModel(id: string): ModelProvider {
  return getModel(id)?.provider ?? "xkiro";
}
