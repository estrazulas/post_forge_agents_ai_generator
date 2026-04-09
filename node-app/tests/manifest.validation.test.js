import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";

import {
  createUniqueRunDir,
  persistRunArtifacts,
  validateManifestShape,
  writeManifest,
} from "../src/run-storage.js";

test("valida estrutura minima de output e manifest", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "stoic-"));
  const { runDir, runId } = await createUniqueRunDir(temp);

  const images = [
    { image_path: "a.png", prompt_used: "p1", seed: 1, generation_time_ms: 10 },
    { image_path: "b.png", prompt_used: "p2", seed: 2, generation_time_ms: 10 },
    { image_path: "c.png", prompt_used: "p3", seed: 3, generation_time_ms: 10 },
  ];

  const texts = [
    { short_text: "s1", medium_text: "m1", status: "pending", rejection_history: [] },
    { short_text: "s2", medium_text: "m2", status: "pending", rejection_history: [] },
    { short_text: "s3", medium_text: "m3", status: "pending", rejection_history: [] },
  ];

  const versions = await persistRunArtifacts(runDir, images, texts, 3);
  const manifest = {
    run_id: runId,
    status: "success",
    versions,
  };

  assert.equal(validateManifestShape(manifest, 3), true);

  const manifestPath = await writeManifest(runDir, manifest);
  const raw = await fs.readFile(manifestPath, "utf-8");
  const parsed = JSON.parse(raw);
  assert.equal(parsed.run_id, runId);
  assert.equal(parsed.versions.length, 3);
});
