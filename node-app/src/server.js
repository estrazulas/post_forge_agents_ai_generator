import express from "express";
import { config } from "./config.js";
import { runGenerationPipeline } from "./pipeline.js";
import { readManifest, updateManifest } from "./run-storage.js";
import { loadImageProfileCatalog } from "./image-profile-catalog.js";
import { validateCurationInput, validateImageInput, validateTextInput } from "./validation.js";

const imageProfileCatalog = await loadImageProfileCatalog(config);

const app = express();
app.use(express.json());

app.get("/health", async (_req, res) => {
  res.json({
    status: "ok",
    image_backend: config.imageBackend,
    image_default_profile: imageProfileCatalog.defaultProfile,
    image_catalog_profiles: Object.keys(imageProfileCatalog.profiles),
    generation_variants: config.generationVariants,
  });
});

app.post("/generate/texts", async (req, res, next) => {
  try {
    const input = validateTextInput(req.body, config.generationVariants);
    const result = await runGenerationPipeline(
      config,
      { scene: "placeholder", mood: "placeholder", variation_level: 0.5 },
      input,
      imageProfileCatalog,
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/pipeline/run", async (req, res, next) => {
  try {
    const imageInput = validateImageInput(req.body?.image || req.body);
    const textInput = validateTextInput(req.body?.text || req.body, config.generationVariants);
    const result = await runGenerationPipeline(config, imageInput, textInput, imageProfileCatalog);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/curation/:runId", async (req, res, next) => {
  try {
    const manifest = await readManifest(config.outputsDir, req.params.runId);
    res.json(manifest);
  } catch (error) {
    next(error);
  }
});

app.post("/curation/:runId/item/:version", async (req, res, next) => {
  try {
    const { status, reason } = validateCurationInput(req.body);
    const version = req.params.version;

    const updated = await updateManifest(config.outputsDir, req.params.runId, (manifest) => {
      manifest.versions = manifest.versions.map((item) => {
        if (item.version !== version) return item;
        const next = { ...item, curation_status: status };
        if (status === "rejected") {
          next.rejection_history = [
            ...next.rejection_history,
            {
              reason,
              rejected_at: new Date().toISOString(),
            },
          ];
        }
        return next;
      });
      return manifest;
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.post("/curation/:runId/regenerate-params", async (req, res, next) => {
  try {
    const manifest = await readManifest(config.outputsDir, req.params.runId);
    const anyApproved = manifest.versions.some((item) => item.curation_status === "approved");

    if (anyApproved) {
      return res.status(409).json({
        error: "Regeneracao disponivel apenas quando nenhuma versao estiver aprovada.",
      });
    }

    return res.json({
      run_id: manifest.run_id,
      regenerate_with: manifest.input,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || (error?.name === "AbortError" ? 504 : 500);
  const message =
    error?.name === "AbortError" && !error?.statusCode
      ? "Operacao abortada por timeout do provider."
      : error.message || "Erro inesperado";
  res.status(statusCode).json({
    error: message,
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    console.log(`node-app ouvindo na porta ${config.port}`);
  });
}

export default app;
