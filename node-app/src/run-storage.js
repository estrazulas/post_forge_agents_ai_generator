import fs from "node:fs/promises";
import path from "node:path";

async function materializeImageInRun(versionDir, version, image) {
  if (!image || typeof image !== "object") return image;

  const normalized = { ...image };
  if (typeof normalized.image_base64 === "string" && normalized.image_base64.length > 0) {
    const fileName = "image.png";
    const filePath = path.join(versionDir, fileName);
    await fs.writeFile(filePath, Buffer.from(normalized.image_base64, "base64"));

    normalized.image_path = `${version}/${fileName}`;
    delete normalized.image_base64;
  }

  return normalized;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export async function createUniqueRunDir(outputsDir) {
  const baseName = `run_${timestamp()}`;
  let candidate = baseName;
  let idx = 0;

  while (true) {
    const runDir = path.join(outputsDir, candidate);
    try {
      await fs.mkdir(runDir, { recursive: false });
      return { runId: candidate, runDir };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      idx += 1;
      candidate = `${baseName}_${idx}`;
    }
  }
}

export async function persistRunArtifacts(runDir, imageItems, textItems, variationCount = 3) {
  const versions = Array.from({ length: variationCount }, (_, i) => `v${i + 1}`);
  const paired = [];

  for (let i = 0; i < versions.length; i += 1) {
    const version = versions[i];
    const versionDir = path.join(runDir, version);
    await fs.mkdir(versionDir, { recursive: true });

    const image = await materializeImageInRun(versionDir, version, imageItems[i] || null);
    const text = textItems[i] || null;

    const payload = {
      version,
      image,
      short_text: text?.short_text || "",
      medium_text: text?.medium_text || "",
      curation_status: text?.status || "pending",
      rejection_history: text?.rejection_history || [],
    };

    await fs.writeFile(path.join(versionDir, "content.json"), JSON.stringify(payload, null, 2));
    paired.push(payload);
  }

  return paired;
}

export async function writeManifest(runDir, manifest) {
  const manifestPath = path.join(runDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
}

export async function readManifest(outputsDir, runId) {
  const filePath = path.join(outputsDir, runId, "manifest.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export async function updateManifest(outputsDir, runId, updater) {
  const runDir = path.join(outputsDir, runId);
  const manifestPath = path.join(runDir, "manifest.json");
  const raw = await fs.readFile(manifestPath, "utf-8");
  const current = JSON.parse(raw);
  const updated = updater(current);
  await fs.writeFile(manifestPath, JSON.stringify(updated, null, 2));
  return updated;
}

export function validateManifestShape(manifest, expectedCount = 3) {
  if (!manifest || typeof manifest !== "object") return false;
  if (!manifest.run_id || !Array.isArray(manifest.versions)) return false;
  if (manifest.versions.length !== expectedCount) return false;
  if (!manifest.status || !["success", "partial", "failed"].includes(manifest.status)) return false;

  for (let index = 0; index < manifest.versions.length; index += 1) {
    const item = manifest.versions[index];
    if (item.version !== `v${index + 1}`) return false;
    if (
      manifest.status !== "failed" &&
      !item.image &&
      !item.short_text &&
      !item.medium_text
    ) {
      return false;
    }
    if (!["pending", "approved", "rejected"].includes(item.curation_status)) return false;
    if (!Array.isArray(item.rejection_history)) return false;
  }

  return true;
}
