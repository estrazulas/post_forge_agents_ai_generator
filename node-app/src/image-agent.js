import fs from "node:fs/promises";
import path from "node:path";

const VALID_REFERENCE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function fail(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

async function loadHeroReferences(config, profileConfig) {
  let entries;
  try {
    entries = await fs.readdir(config.heroReferencesDir, { withFileTypes: true });
  } catch (error) {
    fail(
      `Diretorio de referencias do heroi inacessivel em '${config.heroReferencesDir}': ${error.message}`,
      400,
    );
  }

  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => VALID_REFERENCE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .map((name) => path.join(config.heroReferencesDir, name));

  if (files.length === 0) {
    fail("Diretorio de referencias do heroi vazio ou sem imagens validas.", 400);
  }

  const minReferences = Number(profileConfig.capabilityRequirements?.minReferences || 1);
  const maxReferences = Number(profileConfig.capabilityRequirements?.maxReferences || files.length);

  if (files.length < minReferences) {
    fail(`Perfil requer ao menos ${minReferences} referencias do heroi.`, 400);
  }

  return files.slice(0, Math.max(1, maxReferences));
}

function buildPrompt(imageInput, index) {
  const variation = index + 1;
  return [
    `Scene: ${imageInput.scene}`,
    `Mood: ${imageInput.mood}`,
    `Variation index: v${variation}`,
    `Variation level: ${imageInput.variation_level}`,
    "Style: dark-fantasy",
    "Output: vertical 9:16, preserving hero identity from references",
  ].join(". ");
}

function mimeTypeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

async function generateSingleOpenAiImage(config, profileConfig, imageInput, references, index, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), profileConfig.timeoutMs);
  const prompt = buildPrompt(imageInput, index);

  try {
    const form = new FormData();
    form.append("model", profileConfig.model);
    form.append("prompt", prompt);
    form.append("size", profileConfig.request.size || "1024x1536");
    form.append("quality", profileConfig.request.quality || "auto");
    form.append("n", "1");

    for (const referencePath of references) {
      const bytes = await fs.readFile(referencePath);
      const blob = new Blob([bytes], { type: mimeTypeFromPath(referencePath) });
      form.append("image[]", blob, path.basename(referencePath));
    }

    const response = await fetch(`${config.imageProviderBaseUrl}/images/edits`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: form,
    });

    if (!response.ok) {
      const body = await response.text();
      fail(`Provider remoto indisponivel: ${response.status} ${body}`.trim(), 502);
    }

    const payload = await response.json();
    const first = payload?.data?.[0] || null;
    const imagePath = first?.url || null;
    const imageBase64 = first?.b64_json || null;

    if (!imagePath && !imageBase64) {
      fail("Resposta remota sem imagem em data[0].url ou data[0].b64_json.", 502);
    }

    return {
      image_path: imagePath,
      image_base64: imageBase64,
      prompt_used: prompt,
      seed: Math.floor(Math.random() * 1_000_000_000),
      generation_time_ms: profileConfig.timeoutMs,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      fail(`Timeout remoto excedido para perfil '${imageInput.model_profile || "default"}'.`, 504);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function generateSingleRemoteImage(config, profileConfig, imageInput, references, index) {
  const apiKeyEnv = profileConfig.auth.apiKeyEnv;
  const apiKey = process.env[apiKeyEnv];
  if (!apiKey || !String(apiKey).trim()) {
    fail(`Credencial ausente para provider remoto em ${apiKeyEnv}.`, 400);
  }

  if (profileConfig.provider === "openai") {
    return generateSingleOpenAiImage(config, profileConfig, imageInput, references, index, apiKey);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), profileConfig.timeoutMs);
  const prompt = buildPrompt(imageInput, index);

  try {
    const response = await fetch(`${config.imageProviderBaseUrl}/generate-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: profileConfig.model,
        provider: profileConfig.provider,
        prompt,
        references,
        params: profileConfig.request,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      fail(`Provider remoto indisponivel: ${response.status} ${body}`.trim(), 502);
    }

    const payload = await response.json();
    const imagePath = payload.image_path || payload.image_url || null;
    const imageBase64 = payload.image_base64 || null;

    if (!imagePath && !imageBase64) {
      fail("Resposta remota sem image_path, image_url ou image_base64.", 502);
    }

    return {
      image_path: imagePath,
      image_base64: imageBase64,
      prompt_used: payload.prompt_used || prompt,
      seed: Number.isFinite(payload.seed) ? payload.seed : Math.floor(Math.random() * 1_000_000_000),
      generation_time_ms:
        Number.isFinite(payload.generation_time_ms) ? payload.generation_time_ms : profileConfig.timeoutMs,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      fail(`Timeout remoto excedido para perfil '${imageInput.model_profile || "default"}'.`, 504);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function generateMockImage(profileConfig, imageInput, index) {
  const prompt = buildPrompt(imageInput, index);
  return {
    image_path: `mock://generated/v${index + 1}.png`,
    prompt_used: prompt,
    seed: 1000 + index,
    generation_time_ms: Math.min(profileConfig.timeoutMs, 20 + index * 5),
  };
}

export async function generateImages(
  config,
  imageInput,
  profileResolution,
  imageProfileCatalog,
  variationCount = 3,
) {
  const profileConfig = imageProfileCatalog.profiles[profileResolution.resolvedProfile];
  const references = await loadHeroReferences(config, profileConfig);

  const items = [];
  const start = Date.now();
  let failureReason = null;

  for (let index = 0; index < variationCount; index += 1) {
    try {
      let item;
      if (config.imageBackend === "mock") {
        item = generateMockImage(profileConfig, imageInput, index);
      } else if (config.imageBackend === "remote") {
        item = await generateSingleRemoteImage(config, profileConfig, imageInput, references, index);
      } else {
        fail(`Backend de imagem invalido: ${config.imageBackend}`, 400);
      }

      items.push(item);
    } catch (error) {
      failureReason = error.message;
      if (items.length === 0) {
        return {
          status: "failed",
          items,
          model: profileResolution.model,
          total_generation_time_ms: Date.now() - start,
          failure_reason: failureReason,
          partial_reason: null,
          no_fallback: true,
        };
      }

      return {
        status: "partial",
        items,
        model: profileResolution.model,
        total_generation_time_ms: Date.now() - start,
        failure_reason: failureReason,
        partial_reason: failureReason,
        no_fallback: true,
      };
    }
  }

  return {
    status: "success",
    items,
    model: profileResolution.model,
    total_generation_time_ms: Date.now() - start,
    failure_reason: null,
    partial_reason: null,
    no_fallback: true,
  };
}
