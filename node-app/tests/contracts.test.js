import test from "node:test";
import assert from "node:assert/strict";
import {
  validateImageInput,
  validateTextInput,
  validateCurationInput,
} from "../src/validation.js";

test("contrato de imagem exige campos obrigatorios e normaliza variation_level", () => {
  const valid = validateImageInput({ scene: "montanha", mood: "sombrio", variation_level: 1.7 });
  assert.equal(valid.variation_level, 1);

  assert.throws(() => validateImageInput({ scene: "x", mood: "y" }));
});

test("contrato textual exige 3 curtos e 3 medios", () => {
  const valid = validateTextInput({
    theme: "disciplina",
    tone: "reflexivo",
    short_count: 3,
    medium_count: 3,
  });
  assert.equal(valid.short_count, 3);
  assert.equal(valid.medium_count, 3);

  assert.throws(() =>
    validateTextInput({
      theme: "disciplina",
      tone: "reflexivo",
      short_count: 2,
      medium_count: 3,
    }),
  );
});

test("curadoria exige motivo para rejeicao", () => {
  assert.throws(() => validateCurationInput({ status: "rejected" }));
  const approved = validateCurationInput({ status: "approved" });
  assert.equal(approved.status, "approved");
});
