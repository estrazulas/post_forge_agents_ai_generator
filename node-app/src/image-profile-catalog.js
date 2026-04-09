import fs from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import catalogSchema from "../config/image-profiles.catalog.schema.json" with { type: "json" };

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateCatalogSchema = ajv.compile(catalogSchema);

function fail(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function validateProfile(profileName, profile, globalTimeoutMaxMs) {
  if (!profile || typeof profile !== "object") {
    fail(`Perfil '${profileName}' invalido no catalogo.`);
  }

  if (!profile.provider || typeof profile.provider !== "string") {
    fail(`Perfil '${profileName}' sem provider valido.`);
  }

  if (!profile.model || typeof profile.model !== "string") {
    fail(`Perfil '${profileName}' sem model valido.`);
  }

  if (profile.supportsReferenceImages !== true) {
    fail(`Perfil '${profileName}' deve suportar referencias de imagem do heroi.`);
  }

  if (typeof profile.paid !== "boolean") {
    fail(`Perfil '${profileName}' com campo 'paid' invalido.`);
  }

  if (!isPositiveInteger(profile.timeoutMs)) {
    fail(`Perfil '${profileName}' com timeout invalido.`);
  }

  if (profile.timeoutMs > globalTimeoutMaxMs) {
    fail(
      `Perfil '${profileName}' excede globalTimeoutMaxMs (${globalTimeoutMaxMs}ms).`,
    );
  }

  if (!profile.auth || typeof profile.auth !== "object" || !profile.auth.apiKeyEnv) {
    fail(`Perfil '${profileName}' sem auth.apiKeyEnv.`);
  }

  if (!profile.request || typeof profile.request !== "object") {
    fail(`Perfil '${profileName}' sem bloco request.`);
  }

  if (profile.request.variations !== 3) {
    fail(`Perfil '${profileName}' deve operar com variations=3.`);
  }

  if (!profile.capabilityRequirements || typeof profile.capabilityRequirements !== "object") {
    fail(`Perfil '${profileName}' sem capabilityRequirements.`);
  }

  const inputModalities = profile.capabilityRequirements.inputModalities;
  const outputModalities = profile.capabilityRequirements.outputModalities;

  if (!Array.isArray(inputModalities) || !inputModalities.includes("image_reference")) {
    fail(`Perfil '${profileName}' deve exigir inputModalities com image_reference.`);
  }

  if (!Array.isArray(outputModalities) || !outputModalities.includes("image")) {
    fail(`Perfil '${profileName}' deve declarar outputModalities com image.`);
  }

  if (!profile.errorPolicy || typeof profile.errorPolicy !== "object") {
    fail(`Perfil '${profileName}' sem errorPolicy.`);
  }

  if (profile.errorPolicy.failFast !== true || profile.errorPolicy.retryOnProviderError !== false) {
    fail(`Perfil '${profileName}' viola politica deterministica de falha.`);
  }

  if (profile.errorPolicy.fallbackProfile !== null) {
    fail(`Perfil '${profileName}' nao pode configurar fallbackProfile.`);
  }
}

export async function loadImageProfileCatalog(config) {
  let raw;
  try {
    raw = await fs.readFile(config.imageProfilesCatalogPath, "utf-8");
  } catch (error) {
    fail(
      `Nao foi possivel ler catalogo de perfis em '${config.imageProfilesCatalogPath}': ${error.message}`,
    );
  }

  let catalog;
  try {
    catalog = JSON.parse(raw);
  } catch {
    fail("Catalogo de perfis com JSON invalido.");
  }

  if (!validateCatalogSchema(catalog)) {
    const details = (validateCatalogSchema.errors || [])
      .map((err) => `${err.instancePath || "/"} ${err.message}`.trim())
      .join("; ");
    fail(`Catalogo de perfis invalido no schema: ${details}`);
  }

  if (!catalog || typeof catalog !== "object") fail("Catalogo de perfis invalido.");
  if (!isPositiveInteger(catalog.version)) fail("Catalogo sem versao valida.");
  if (!isPositiveInteger(catalog.globalTimeoutMaxMs)) {
    fail("Catalogo sem globalTimeoutMaxMs valido.");
  }
  if (catalog.globalTimeoutMaxMs > 90000) {
    fail("Catalogo excede teto global de 90000ms por imagem.");
  }

  if (!catalog.profiles || typeof catalog.profiles !== "object") {
    fail("Catalogo sem bloco profiles valido.");
  }

  const profileNames = Object.keys(catalog.profiles);
  if (profileNames.length === 0) fail("Catalogo sem perfis cadastrados.");

  for (const profileName of profileNames) {
    validateProfile(profileName, catalog.profiles[profileName], catalog.globalTimeoutMaxMs);
  }

  const configuredDefault = config.imageDefaultProfile || catalog.defaultProfile;
  if (!configuredDefault || typeof configuredDefault !== "string") {
    fail("Catalogo sem defaultProfile valido.");
  }
  if (!catalog.profiles[configuredDefault]) {
    fail(`defaultProfile '${configuredDefault}' nao existe no catalogo.`);
  }

  return {
    ...catalog,
    defaultProfile: configuredDefault,
  };
}

export function resolveImageProfile(catalog, requestedProfile) {
  const normalizedRequested = typeof requestedProfile === "string" ? requestedProfile.trim() : "";
  const resolvedProfile = normalizedRequested || catalog.defaultProfile;
  const profile = catalog.profiles[resolvedProfile];

  if (!profile) {
    fail(`Perfil de imagem '${resolvedProfile}' nao existe no catalogo.`, 400);
  }

  if (profile.paid) {
    const envName = profile.auth.apiKeyEnv;
    const key = process.env[envName];
    if (!key || !String(key).trim()) {
      fail(
        `Perfil pago '${resolvedProfile}' requer credencial valida em ${envName}.`,
        400,
      );
    }
  }

  return {
    requestedProfile: normalizedRequested || null,
    resolvedProfile,
    provider: profile.provider,
    model: profile.model,
    timeoutMs: profile.timeoutMs,
    paid: profile.paid,
  };
}
