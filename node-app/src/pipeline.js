import path from "node:path";
import { generateStoicTexts } from "./text-agent.js";
import { resolveImageProfile } from "./image-profile-catalog.js";
import { generateImages } from "./image-agent.js";
import {
  createUniqueRunDir,
  persistRunArtifacts,
  validateManifestShape,
  writeManifest,
} from "./run-storage.js";

export async function runGenerationPipeline(config, imageInput, textInput, imageProfileCatalog) {
  const variationCount = config.generationVariants || 1;
  const resolvedImageProfile = resolveImageProfile(imageProfileCatalog, imageInput.model_profile);

  const start = Date.now();
  const imagePayload = await generateImages(
    config,
    {
      ...imageInput,
      model_profile: resolvedImageProfile.resolvedProfile,
    },
    resolvedImageProfile,
    imageProfileCatalog,
    variationCount,
  );

  const textPayload =
    imagePayload.status === "failed"
      ? { model: config.openRouterApiKey ? config.openRouterModel : "local-fallback", items: [] }
      : await generateStoicTexts(config, textInput, variationCount);

  const { runDir, runId } = await createUniqueRunDir(config.outputsDir);
  const paired = await persistRunArtifacts(runDir, imagePayload.items, textPayload.items, variationCount);

  const status = imagePayload.status;

  const manifest = {
    run_id: runId,
    created_at: new Date().toISOString(),
    status,
    input: {
      image: imageInput,
      text: textInput,
    },
    models: {
      image_model: imagePayload.model,
      text_model: textPayload.model,
    },
    image_profile: {
      requested_profile: resolvedImageProfile.requestedProfile,
      resolved_profile: resolvedImageProfile.resolvedProfile,
      provider: resolvedImageProfile.provider,
      model: resolvedImageProfile.model,
      paid: resolvedImageProfile.paid,
      timeout_ms: resolvedImageProfile.timeoutMs,
    },
    durations_ms: {
      total: Date.now() - start,
      image: imagePayload.total_generation_time_ms,
    },
    failure_reason: imagePayload.failure_reason || null,
    no_fallback: imagePayload.no_fallback === true,
    image_partial_reason: imagePayload.partial_reason || null,
    variation_count: variationCount,
    versions: paired,
    seeds: imagePayload.items.map((item) => item.seed),
  };

  const valid = validateManifestShape(manifest, variationCount);
  if (!valid) {
    const error = new Error("Manifesto invalido: estrutura incompleta");
    error.statusCode = 500;
    throw error;
  }

  const manifestPath = await writeManifest(runDir, manifest);

  return {
    run_id: runId,
    status,
    output_dir: path.dirname(manifestPath),
    manifest,
  };
}
