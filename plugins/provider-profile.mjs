import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.resolve(__dirname, "..", "opencode.json");

const PROFILE_MAP = Object.freeze({
  // opencode-go（全部 max effort）：
  //   model  (預設 implementation agents)         → gpt-6-luna max
  //   heavy  (SA/SD/reviewer/team-lead/architect) → claude-haiku-5-5 max
  //   small  (verifier / title)                   → deepseek-v4.1-flash max
  opencode: Object.freeze({
    model: "opencode-go/gpt-6-luna",
    model_variant: "max",
    small_model: "opencode-go/deepseek-v4.1-flash",
    small_variant: "max",
    heavy_model: "opencode-go/claude-haiku-5-5",
    heavy_variant: "max",
    reasoning: Object.freeze({
      "opencode-go/deepseek-v4.1-flash": Object.freeze({
        default_effort: "max",
        efforts: ["low", "high", "max"],
      }),
    }),
  }),
  // OpenAI 系列：effort 透過 `provider/model#variant` 指定（opencode 內建 variant，不需 provider 覆寫）。
  //   heavy  (SA/SD/reviewer/team-lead/architect) → gpt-6.2-sol medium （最高）
  //   model  (預設 implementation agents)         → gpt-6.2-sol low    （其次）
  //   small  (verifier / title)                   → gpt-6.1-terra medium（最低）
  openai: Object.freeze({
    model: "openai/gpt-6.2-sol",
    model_variant: "low",
    small_model: "openai/gpt-6.1-terra",
    small_variant: "medium",
    heavy_model: "openai/gpt-6.2-sol",
    heavy_variant: "medium",
  }),
  // GitHub Copilot：effort 透過 `provider/model#variant` 指定（opencode 內建 variant，不需 provider 覆寫）。
  //   heavy  (SA/SD/reviewer/team-lead/architect) → gpt-6.1-sol medium （最高）
  //   model  (預設 implementation agents)         → claude-haiku-5.5 xhigh（其次）
  //   small  (verifier / title)                   → gpt-6-luna max      （最低）
  copilot: Object.freeze({
    model: "github-copilot/claude-haiku-5.5",
    model_variant: "xhigh",
    small_model: "github-copilot/gpt-6-luna",
    small_variant: "max",
    heavy_model: "github-copilot/gpt-6.1-sol",
    heavy_variant: "medium",
  }),
  // Anthropic 系列：effort 透過 `provider/model#variant` 指定（opencode 內建 variant，不需 provider 覆寫）。
  //   heavy  (SA/SD/reviewer/team-lead/architect) → sonnet-5-5 high   （最高）
  //   model  (預設 implementation agents)         → haiku-5-5  max    （其次）
  //   small  (verifier / title)                   → haiku-5-5  high   （最低）
  anthropic: Object.freeze({
    model: "anthropic/claude-haiku-5-5",
    model_variant: "max",
    small_model: "anthropic/claude-haiku-5-5",
    small_variant: "high",
    heavy_model: "anthropic/claude-sonnet-5-5",
    heavy_variant: "high",
  }),
});

const SUPPORTED_PROFILES = Object.keys(PROFILE_MAP);
const HEAVY_AGENTS = [
  "design-evidence",
  "business-analyst",
  "system-designer",
  "code-reviewer",
  "team-lead",
  "architect",
];
const ALL_OVERRIDDEN_AGENTS = [...HEAVY_AGENTS, "verifier"];

function normalizeProfileValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function assertKnownProfile(value) {
  if (!SUPPORTED_PROFILES.includes(value)) {
    throw new Error(
      `Unknown provider profile "${value}". Must be one of: ${SUPPORTED_PROFILES.join(", ")}`,
    );
  }
}

function pickProfile(options = {}) {
  const optionProfile = normalizeProfileValue(options.profile);
  const envProfile = normalizeProfileValue(process.env.OPENCODE_PROVIDER_PROFILE);
  const activeProfile = optionProfile || envProfile || "opencode";

  assertKnownProfile(activeProfile);

  return activeProfile;
}

/**
 * Append an optional reasoning variant to a model ref using opencode's
 * `provider/model#variant` syntax (e.g. `anthropic/claude-haiku-5-5#max`).
 */
function withVariant(modelRef, variant) {
  return variant ? `${modelRef}#${variant}` : modelRef;
}

export default function resolveProfile(options = {}) {
  const activeProfile = pickProfile(options);
  const profile = PROFILE_MAP[activeProfile];

  const model = withVariant(profile.model, profile.model_variant);
  const smallModel = withVariant(profile.small_model, profile.small_variant);
  const heavyModel = withVariant(profile.heavy_model, profile.heavy_variant);

  return {
    model,
    small_model: smallModel,
    agent_overrides: {
      "design-evidence": heavyModel,
      "business-analyst": heavyModel,
      "system-designer": heavyModel,
      verifier: smallModel,
      "code-reviewer": heavyModel,
      "team-lead": heavyModel,
      architect: heavyModel,
    },
  };
}

export function buildProfileConfig(options = {}) {
  const activeProfile = pickProfile(options);
  const profile = PROFILE_MAP[activeProfile];
  const resolved = resolveProfile(options);
  const provider = buildProviderOverrides(profile);

  return {
    model: resolved.model,
    small_model: resolved.small_model,
    ...(Object.keys(provider).length > 0 ? { provider } : {}),
    agent: Object.fromEntries(
      ALL_OVERRIDDEN_AGENTS.map((name) => [name, { model: resolved.agent_overrides[name] }]),
    ),
  };
}

/**
 * Build the `provider` config fragment for models that need reasoning-effort
 * variants (e.g. gpt-5.6-luna with high/medium/low effort switching, or
 * deepseek-v4.1-flash with low/high/max effort switching).
 *
 * Output shape (merged into opencode config via OPENCODE_CONFIG_CONTENT):
 *   provider.openai.models["gpt-5.6-luna"] = {
 *     options: { reasoningEffort: <default_effort> },
 *     variants: { high: { reasoningEffort: "high" }, ... },
 *   }
 */
function buildProviderOverrides(profile) {
  if (!profile.reasoning) return {};

  const provider = {};
  for (const [modelRef, cfg] of Object.entries(profile.reasoning)) {
    const [providerId, ...rest] = modelRef.split("/");
    const modelId = rest.join("/");
    if (!providerId || !modelId) continue;

    const variants = {};
    for (const effort of cfg.efforts) {
      variants[effort] = { reasoningEffort: effort };
    }

    const modelConfig = { variants };
    if (cfg.default_effort) {
      modelConfig.options = { reasoningEffort: cfg.default_effort };
    }

    provider[providerId] = {
      models: {
        [modelId]: modelConfig,
      },
    };
  }

  return provider;
}

function isProviderProfilePlugin(entry) {
  return typeof entry === "string" && entry.replaceAll("\\", "/").endsWith("provider-profile.mjs");
}

export function readPluginOptions(configPath = CONFIG_PATH) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const plugins = Array.isArray(config.plugin) ? config.plugin : [];

    for (const plugin of plugins) {
      if (Array.isArray(plugin) && plugin.length === 2 && isProviderProfilePlugin(plugin[0])) {
        return plugin[1] && typeof plugin[1] === "object" ? plugin[1] : {};
      }
    }
  } catch {
    return {};
  }

  return {};
}

/**
 * ProviderProfilePlugin — runtime hook placeholder (no-op).
 *
 * This is a no-op runtime hook for opencode's plugin system.
 * The actual model-profile switching happens outside the runtime hook:
 *
 *   1) `bin/moc` (the shell launcher) or direct invocation sets
 *      `OPENCODE_CONFIG_CONTENT` by running this module directly:
 *      `node plugins/provider-profile.mjs`
 *
 *   2) The direct-execution path at the bottom of this file generates
 *      the JSON config override fragment that opencode merges at startup.
 *
 * This function exists so the module is loadable as an opencode plugin,
 * but no runtime transformation is needed because the config override is
 * already applied via `OPENCODE_CONFIG_CONTENT` at process launch.
 *
 * @returns {object} Empty object — no runtime hook behavior.
 */
export function ProviderProfilePlugin() {
  return {};
}

function isDirectExecution() {
  const scriptPath = process.argv[1];
  return scriptPath ? path.resolve(scriptPath) === __filename : false;
}

if (isDirectExecution()) {
  const options = readPluginOptions();
  process.stdout.write(`${JSON.stringify(buildProfileConfig(options))}\n`);
}
