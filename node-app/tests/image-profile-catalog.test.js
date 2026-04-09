import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

import { loadImageProfileCatalog, resolveImageProfile } from "../src/image-profile-catalog.js";

test("carrega catalogo e resolve perfil default", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "catalog-"));
  const catalogPath = path.join(temp, "catalog.json");

  await fs.writeFile(
    catalogPath,
    JSON.stringify(
      {
        version: 1,
        defaultProfile: "fast",
        globalTimeoutMaxMs: 90000,
        profiles: {
          fast: {
            provider: "provider_b",
            model: "provider_b/image-ref-fast-v2",
            supportsReferenceImages: true,
            paid: false,
            timeoutMs: 30000,
            auth: { apiKeyEnv: "DUMMY_FAST_KEY" },
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

  const catalog = await loadImageProfileCatalog({
    imageProfilesCatalogPath: catalogPath,
    imageDefaultProfile: "",
  });

  const resolved = resolveImageProfile(catalog, null);
  assert.equal(resolved.resolvedProfile, "fast");
  assert.equal(resolved.paid, false);
});

test("bloqueia perfil pago sem credencial", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "catalog-"));
  const catalogPath = path.join(temp, "catalog-paid.json");

  await fs.writeFile(
    catalogPath,
    JSON.stringify(
      {
        version: 1,
        defaultProfile: "quality",
        globalTimeoutMaxMs: 90000,
        profiles: {
          quality: {
            provider: "provider_a",
            model: "provider_a/image-ref-quality-v1",
            supportsReferenceImages: true,
            paid: true,
            timeoutMs: 60000,
            auth: { apiKeyEnv: "MISSING_PAID_KEY" },
            request: { size: "1024x1792", quality: "high", style: "dark-fantasy", variations: 3 },
            capabilityRequirements: {
              inputModalities: ["text", "image_reference"],
              outputModalities: ["image"],
              minReferences: 1,
              maxReferences: 4,
            },
            errorPolicy: { failFast: true, retryOnProviderError: false, fallbackProfile: null },
          },
        },
      },
      null,
      2,
    ),
  );

  const catalog = await loadImageProfileCatalog({
    imageProfilesCatalogPath: catalogPath,
    imageDefaultProfile: "",
  });

  assert.throws(() => resolveImageProfile(catalog, null), /requer credencial valida/);
});
