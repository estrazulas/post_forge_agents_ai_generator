import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

import { runGenerationPipeline } from "../src/pipeline.js";
import { loadImageProfileCatalog } from "../src/image-profile-catalog.js";

async function setupTempCatalog(defaultProfile = "balanced") {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "pipeline-profile-"));
  const catalogPath = path.join(temp, "catalog.json");
  const refsDir = path.join(temp, "refs");
  const outputsDir = path.join(temp, "outputs");

  await fs.mkdir(refsDir, { recursive: true });
  await fs.mkdir(outputsDir, { recursive: true });
  await fs.writeFile(path.join(refsDir, "hero.jpg"), "fake-image");

  await fs.writeFile(
    catalogPath,
    JSON.stringify(
      {
        version: 1,
        defaultProfile: defaultProfile,
        globalTimeoutMaxMs: 90000,
        profiles: {
          balanced: {
            provider: "provider_a",
            model: "provider_a/image-ref-balanced-v1",
            supportsReferenceImages: true,
            paid: false,
            timeoutMs: 45000,
            auth: { apiKeyEnv: "IMAGE_PROVIDER_A_API_KEY" },
            request: { size: "1024x1792", quality: "medium", style: "dark-fantasy", variations: 3 },
            capabilityRequirements: {
              inputModalities: ["text", "image_reference"],
              outputModalities: ["image"],
              minReferences: 1,
              maxReferences: 4,
            },
            errorPolicy: { failFast: true, retryOnProviderError: false, fallbackProfile: null },
          },
          fast: {
            provider: "provider_b",
            model: "provider_b/image-ref-fast-v2",
            supportsReferenceImages: true,
            paid: false,
            timeoutMs: 30000,
            auth: { apiKeyEnv: "IMAGE_PROVIDER_B_API_KEY" },
            request: { size: "1024x1792", quality: "standard", style: "dark-fantasy", variations: 3 },
            capabilityRequirements: {
              inputModalities: ["text", "image_reference"],
              outputModalities: ["image"],
              minReferences: 1,
              maxReferences: 3,
            },
            errorPolicy: { failFast: true, retryOnProviderError: false, fallbackProfile: null },
          },
        },
      },
      null,
      2,
    ),
  );

  return { temp, catalogPath, refsDir, outputsDir };
}

test("pipeline resolve image.model_profile quando informado", async () => {
  const { catalogPath, refsDir, outputsDir } = await setupTempCatalog("balanced");

  const catalog = await loadImageProfileCatalog({
    imageProfilesCatalogPath: catalogPath,
    imageDefaultProfile: "",
  });

  const result = await runGenerationPipeline(
    {
      imageBackend: "mock",
      imageProviderBaseUrl: "https://api.example.invalid/v1",
      imageProfilesCatalogPath: catalogPath,
      imageDefaultProfile: "",
      heroReferencesDir: refsDir,
      outputsDir,
      openRouterApiKey: "",
      openRouterModel: "openrouter/free",
      openRouterBaseUrl: "https://openrouter.ai/api/v1",
      textRetries: 0,
      textTimeoutMs: 1000,
      generationVariants: 3,
    },
    {
      scene: "ruinas",
      mood: "sombrio",
      variation_level: 0.7,
      model_profile: "fast",
    },
    {
      theme: "disciplina",
      tone: "reflexivo",
      short_count: 3,
      medium_count: 3,
      avoid_direct_quotes: true,
    },
    catalog,
  );

  assert.equal(result.status, "success");
  assert.equal(result.manifest.image_profile.resolved_profile, "fast");
  assert.equal(result.manifest.image_profile.requested_profile, "fast");
});

test("pipeline usa default global quando image.model_profile nao informado", async () => {
  const { catalogPath, refsDir, outputsDir } = await setupTempCatalog("balanced");

  const catalog = await loadImageProfileCatalog({
    imageProfilesCatalogPath: catalogPath,
    imageDefaultProfile: "",
  });

  const result = await runGenerationPipeline(
    {
      imageBackend: "mock",
      imageProviderBaseUrl: "https://api.example.invalid/v1",
      imageProfilesCatalogPath: catalogPath,
      imageDefaultProfile: "",
      heroReferencesDir: refsDir,
      outputsDir,
      openRouterApiKey: "",
      openRouterModel: "openrouter/free",
      openRouterBaseUrl: "https://openrouter.ai/api/v1",
      textRetries: 0,
      textTimeoutMs: 1000,
      generationVariants: 3,
    },
    {
      scene: "ruinas",
      mood: "sombrio",
      variation_level: 0.7,
      model_profile: null,
    },
    {
      theme: "disciplina",
      tone: "reflexivo",
      short_count: 3,
      medium_count: 3,
      avoid_direct_quotes: true,
    },
    catalog,
  );

  assert.equal(result.status, "success");
  assert.equal(result.manifest.image_profile.resolved_profile, "balanced");
  assert.equal(result.manifest.image_profile.requested_profile, null);
});
