import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");

test("docker-compose possui node-app com healthcheck sem dependencia de image-service", () => {
  const composePath = path.join(root, "docker-compose.yml");
  const content = fs.readFileSync(composePath, "utf-8");

  assert.match(content, /node-app:/);
  assert.match(content, /healthcheck:/g);
  assert.doesNotMatch(content, /image-service:/);
  assert.doesNotMatch(content, /depends_on:/);
});

test("precheck valida requisitos obrigatorios", () => {
  const precheckPath = path.join(root, "scripts", "precheck.sh");
  const content = fs.readFileSync(precheckPath, "utf-8");

  assert.match(content, /docker compose version/);
  assert.match(content, /Node.js 20\+/);
  assert.match(content, /Python 3\.11\+/);
});
