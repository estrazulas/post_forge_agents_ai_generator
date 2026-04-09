import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

import { generateImages } from "../src/image-agent.js";

async function setupReferencesDir() {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "image-agent-"));
  const refsDir = path.join(temp, "refs");
  await fs.mkdir(refsDir, { recursive: true });
  await fs.writeFile(path.join(refsDir, "hero.jpg"), "fake-image");
  return refsDir;
}

test("falha deterministica quando provider remoto indisponivel", async () => {
  const refsDir = await setupReferencesDir();
  process.env.IMAGE_PROVIDER_B_API_KEY = "dummy-key";

  const previousFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 503,
    text: async () => "service unavailable",
  });

  try {
    const result = await generateImages(
      {
        imageBackend: "remote",
        imageProviderBaseUrl: "https://remote.example.test/v1",
        heroReferencesDir: refsDir,
      },
      {
        scene: "desfiladeiro",
        mood: "sombrio",
        variation_level: 0.6,
        model_profile: "fast",
      },
      {
        requestedProfile: "fast",
        resolvedProfile: "fast",
        provider: "provider_b",
        model: "provider_b/image-ref-fast-v2",
        timeoutMs: 30000,
        paid: false,
      },
      {
        profiles: {
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
              maxReferences: 2,
            },
            errorPolicy: { failFast: true, retryOnProviderError: false, fallbackProfile: null },
          },
        },
      },
    );

    assert.equal(result.status, "failed");
    assert.equal(result.no_fallback, true);
    assert.match(result.failure_reason, /Provider remoto indisponivel/);
    assert.equal(result.items.length, 0);
  } finally {
    global.fetch = previousFetch;
  }
});
