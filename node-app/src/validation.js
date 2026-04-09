export const CURATION_STATUSES = ["pending", "approved", "rejected"];

function fail(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

export function validateImageInput(payload) {
  if (!payload || typeof payload !== "object") fail("Payload de imagem invalido.");
  const { scene, mood, variation_level, model_profile } = payload;

  if (!scene || typeof scene !== "string") fail("Campo 'scene' e obrigatorio.");
  if (!mood || typeof mood !== "string") fail("Campo 'mood' e obrigatorio.");

  if (typeof variation_level !== "number") {
    fail("Campo 'variation_level' deve ser numero entre 0 e 1.");
  }

  const normalizedProfile =
    typeof model_profile === "string" && model_profile.trim() ? model_profile.trim() : null;

  return {
    scene: scene.trim(),
    mood: mood.trim(),
    variation_level: Math.max(0, Math.min(1, variation_level)),
    model_profile: normalizedProfile,
  };
}

export function validateTextInput(payload, expectedCount = 3) {
  if (!payload || typeof payload !== "object") fail("Payload de texto invalido.");
  const theme = typeof payload.theme === "string" ? payload.theme.trim() : "";
  const tone = typeof payload.tone === "string" ? payload.tone.trim() : "";

  if (!theme) fail("Campo 'theme' e obrigatorio.");
  if (!["agressivo", "reflexivo"].includes(tone)) {
    fail("Campo 'tone' deve ser 'agressivo' ou 'reflexivo'.");
  }

  const shortCount = Number(payload.short_count ?? expectedCount);
  const mediumCount = Number(payload.medium_count ?? expectedCount);
  if (shortCount !== expectedCount || mediumCount !== expectedCount) {
    fail(`Esta versao exige short_count=${expectedCount} e medium_count=${expectedCount}.`);
  }

  return {
    theme,
    tone,
    short_count: shortCount,
    medium_count: mediumCount,
    avoid_direct_quotes: Boolean(payload.avoid_direct_quotes),
  };
}

export function validateCurationInput(payload) {
  if (!payload || typeof payload !== "object") fail("Payload de curadoria invalido.");
  const status = payload.status;
  if (!CURATION_STATUSES.includes(status)) {
    fail("Status de curadoria invalido.");
  }
  const reason = payload.reason ? String(payload.reason).trim() : "";
  if (status === "rejected" && !reason) {
    fail("Motivo e obrigatorio para status rejected.");
  }
  return { status, reason };
}
