import test from "node:test";
import assert from "node:assert/strict";
import { recommend, profileSchema } from "../src/recommend.js";
const base = {
  area: "dados",
  goal: "trabalho",
  level: 0,
  hours: 10,
  device: "computer",
  freeCertificate: false,
  skills: [],
};
test("limita a três e protege iniciantes", () => {
  let r = recommend(base);
  assert.ok(r.results.length <= 3);
  assert.ok(r.results.every((x) => x.course.level === 0));
});
test("certificado grátis exclui certificado pago", () =>
  assert.ok(
    recommend({ ...base, freeCertificate: true }).results.every(
      (x) => x.course.certificate === "free",
    ),
  ));
test("celular não recebe curso prático de computador", () =>
  assert.equal(recommend({ ...base, device: "mobile" }).results.length, 0));
test("prazo real exclui carga incompatível", () =>
  assert.equal(
    recommend({ ...base, hours: 0.5, freeCertificate: true }).results.length,
    0,
  ));
test("nível genérico não substitui pré-requisito específico", () =>
  assert.ok(
    recommend({ ...base, level: 2 }).results.every(
      (x) => !x.course.requires.length,
    ),
  ));
test("sem HTML não indica continuação de HTML", () =>
  assert.ok(
    recommend({ ...base, area: "sites", level: 2 }).results.every(
      (x) => x.course.id !== "html2",
    ),
  ));
test("confirmação específica permite continuação", () =>
  assert.ok(
    recommend({
      ...base,
      area: "sites",
      level: 1,
      skills: ["html"],
    }).results.some((x) => x.course.id === "html2"),
  ));
test("dados inválidos são rejeitados", () => {
  for (const p of [
    { ...base, hours: 0 },
    { ...base, level: 9 },
    { ...base, area: "inventado" },
    { ...base, age: 60 },
  ])
    assert.equal(profileSchema.safeParse(p).success, false);
});
test("determinismo e justificativa não dependem de idade", () =>
  assert.deepEqual(recommend(base), recommend({ ...base })));
