import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { PGlite } from "@electric-sql/pglite";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";
const origin = "http://localhost:3000";
async function waitFor(fn) {
  for (let i = 0; i < 200; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw Error("Interface não atingiu o estado esperado");
}
test("fluxo de interface: perfil, consentimento, feedback, painel e exclusão", async () => {
  const db = new PGlite();
  await db.exec(
    await readFile(new URL("../db/001-init.sql", import.meta.url), "utf8"),
  );
  const app = createApp({
    db,
    config: {
      APP_ORIGIN: origin,
      DATABASE_URL: "isolated-test",
      SESSION_SECRET: "t".repeat(40),
      ADMIN_PASSWORD_HASH: await bcrypt.hash("senha-sintetica-de-teste", 4),
      DATA_MODE: "test",
    },
  });
  const client = request.agent(app),
    dom = new JSDOM(
      await readFile(new URL("../public/index.html", import.meta.url), "utf8"),
      { url: origin, runScripts: "outside-only" },
    ),
    w = dom.window;
  const errors = [];
  w.addEventListener("error", (e) => errors.push(e.message));
  w.scrollTo = () => {};
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.fetch = async (url, options = {}) => {
    let r = client[(options.method || "GET").toLowerCase()](url).set(
      "Origin",
      origin,
    );
    if (options.body)
      r = r
        .set("Content-Type", "application/json")
        .send(JSON.parse(options.body));
    r = await r;
    return { ok: r.status < 400, status: r.status, json: async () => r.body };
  };
  const q = (s) => w.document.querySelector(s),
    text = () => q("main").textContent;
  const submit = () =>
    q("main form").dispatchEvent(
      new w.Event("submit", { bubbles: true, cancelable: true }),
    );
  const select = (name, value) => {
    q(`input[name="${name}"][value="${value}"]`).checked = true;
    submit();
  };
  try {
    w.eval(
      await readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    );
    await waitFor(() => text().includes("Seu próximo passo."));
    w.location.hash = "perfil";
    await waitFor(() => q("#profile-form"));
    select("area", "sites");
    select("goal", "projeto");
    select("level", "0");
    q("[name=hours]").value = "5";
    submit();
    select("device", "computer");
    select("freeCertificate", "false");
    await waitFor(() => text().includes("Seu próximo curso pode estar aqui."));
    assert.equal(q("main").querySelectorAll(".course").length, 1);
    q("[data-detail]").click();
    assert.equal(q("dialog").open, true);
    assert.match(q("#dialog-content").textContent, /Computador/);
    q("#close-dialog").click();
    w.location.hash = "participar";
    await waitFor(() => q("#consent-form"));
    q("[name=name]").value = "TESTE SINTÉTICO DO FLUXO";
    q("[name=adult]").checked = true;
    q("[name=consent]").checked = true;
    submit();
    await waitFor(() => q("#feedback-form"));
    const token = q(".token").textContent;
    q("[name=fit][value=parte]").checked = true;
    q("[name=comment]").value = "<img src=x onerror=alert(1)> teste";
    submit();
    await waitFor(() => text().includes("Feedback salvo"));
    assert.equal(
      (await db.query("SELECT count(*)::int n FROM feedback")).rows[0].n,
      1,
    );
    w.location.hash = "admin";
    await waitFor(() => q("#login-form"));
    q("[name=password]").value = "senha-sintetica-de-teste";
    submit();
    await waitFor(() => q("#admin-mode"));
    assert.match(text(), /Nenhum registro neste ambiente/);
    q("#admin-mode").value = "test";
    q("#admin-mode").dispatchEvent(new w.Event("change"));
    await waitFor(() => q("tbody tr"));
    assert.doesNotMatch(q("tbody").textContent, /TESTE SINTÉTICO/);
    q("#hide-names").checked = false;
    q("#hide-names").dispatchEvent(new w.Event("change"));
    await waitFor(() => q("tbody")?.textContent.includes("TESTE SINTÉTICO"));
    q("#hide-comments").checked = false;
    q("#hide-comments").dispatchEvent(new w.Event("change"));
    await waitFor(() => q("tbody")?.textContent.includes("<img src=x"));
    assert.equal(q("tbody").querySelectorAll("img").length, 0);
    w.location.hash = "privacidade";
    await waitFor(() => q("#delete-self"));
    assert.equal(q("[name=token]").value, token);
    q("input[type=checkbox]").checked = true;
    submit();
    await waitFor(() => text().includes("Solicitação concluída"));
    assert.equal(
      (await db.query("SELECT count(*)::int n FROM participations")).rows[0].n,
      0,
    );
    w.location.hash = "catalogo";
    await waitFor(() => q("#filters"));
    q("[name=q]").value = "coisa inexistente";
    q("#filters").dispatchEvent(new w.Event("input"));
    assert.match(text(), /Nenhum curso encontrado/);
    assert.deepEqual(errors, []);
  } finally {
    w.close();
    await db.close();
  }
});
