import path from "node:path";

function parseGenerationVariants(rawValue) {
  const value = Number(rawValue ?? 1);
  if (!Number.isInteger(value) || value < 1) return 1;
  return Math.min(value, 10);
}

export const config = {
  port: Number(process.env.PORT || 3000),
  imageBackend: process.env.IMAGE_BACKEND || "remote",
  imageProviderBaseUrl: process.env.IMAGE_PROVIDER_BASE_URL || "https://api.example.invalid/v1",
  imageProfilesCatalogPath:
    process.env.IMAGE_PROFILES_CATALOG_PATH ||
    path.resolve(process.cwd(), "config/image-profiles.catalog.example.json"),
  imageDefaultProfile: process.env.IMAGE_DEFAULT_PROFILE || "",
  heroReferencesDir:
    process.env.HERO_REFERENCES_DIR || path.resolve(process.cwd(), "../assets/hero-references"),
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
  openRouterModel: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
  openRouterBaseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  textRetries: Number(process.env.TEXT_RETRIES || 2),
  textTimeoutMs: Number(process.env.TEXT_TIMEOUT_MS || 15000),
  generationVariants: parseGenerationVariants(process.env.GENERATION_VARIANTS),
  outputsDir: process.env.OUTPUTS_DIR || path.resolve(process.cwd(), "../outputs"),
};
