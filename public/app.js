const main = document.querySelector("#main"),
  announce = document.querySelector("#announcer");
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const levels = ["Iniciante", "Intermediário", "Avançado"];
const goals = {
  zero: "Começar do zero",
  trabalho: "Desenvolver habilidades para o trabalho",
  projeto: "Realizar um projeto",
};
const state = {
  catalog: null,
  step: 0,
  profile: {
    area: "",
    goal: "",
    level: 0,
    hours: 3,
    device: "",
    freeCertificate: false,
    skills: [],
  },
  recommendations: null,
  participation: null,
  token: null,
  pendingToken: null,
  filters: { area: "", q: "", certificate: "" },
  admin: { mode: "real", hideNames: true, hideComments: true, page: 1 },
};
async function api(path, { method = "GET", body } = {}) {
  const r = await fetch("/api" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  const d = await r
    .json()
    .catch(() => ({ error: "Resposta inválida do servidor." }));
  if (!r.ok) {
    const e = new Error(d.error || "Não foi possível concluir.");
    e.status = r.status;
    throw e;
  }
  return d;
}
function errorIn(node, e) {
  let el = node.querySelector(".error");
  if (!el) {
    el = document.createElement("div");
    el.className = "error";
    el.setAttribute("role", "alert");
    node.append(el);
  }
  el.textContent = e.message || String(e);
}
async function busy(button, fn) {
  const text = button.textContent;
  button.disabled = true;
  button.textContent = "Aguarde…";
  try {
    return await fn();
  } finally {
    button.disabled = false;
    button.textContent = text;
  }
}
function goto(route) {
  if (location.hash === "#" + route) render();
  else location.hash = route;
}
function page(html) {
  main.innerHTML = `<div class="wrap">${html}</div>`;
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
function title(kicker, heading, desc) {
  return `<div class="page-title"><p class="eyebrow">${esc(kicker)}</p><h1>${heading}</h1>${desc ? `<p>${desc}</p>` : ""}</div>`;
}
function home() {
  page(
    `<section class="hero"><div><p class="eyebrow"><span class="dot"></span> Aprender começa com uma boa escolha</p><h1>Seu próximo passo.<br><em>Um curso gratuito.</em></h1><p class="lede">Encontre cursos gratuitos que combinam com seu perfil.</p><p class="muted">Conte o que quer aprender e o tempo que tem. Nós ajudamos a comparar opções de instituições confiáveis.</p><div class="actions"><a class="button" href="#perfil">Encontrar meu curso <span aria-hidden="true">↗</span></a><a class="button secondary" href="#catalogo">Explorar o catálogo</a></div><p class="fine">Sem cadastro para buscar. Você estuda no site da instituição.</p></div><div class="path-panel" aria-label="Como funciona"><p class="eyebrow">Uma direção para começar</p><p class="path-title">O caminho parte<br>de você.</p><div class="path-step"><b>01</b><div><strong>Seu perfil</strong><small>Interesses, experiência e rotina</small></div></div><div class="path-step"><b>02</b><div><strong>Suas possibilidades</strong><small>Até três cursos para comparar</small></div></div><div class="path-step"><b>03</b><div><strong>Seu próximo aprendizado</strong><small>Acesso direto à instituição</small></div></div></div></section><section><div class="section-head"><h2>Por onde você quer começar?</h2><p>Explore por área ou deixe suas respostas ajudarem na escolha.</p></div><div class="area-grid">${Object.entries(
      state.catalog.areas,
    )
      .map(
        ([id, label], i) =>
          `<a class="area-card" href="#catalogo/${id}"><span>0${i + 1} <span aria-hidden="true">↗</span></span><strong>${esc(label)}</strong></a>`,
      )
      .join(
        "",
      )}</div></section><section class="explain-strip"><div><h3>Critérios que você entende</h3><p>As indicações consideram seu objetivo, conhecimentos, tempo e recursos. Sem promessa de curso perfeito.</p></div><div><h3>Gratuidade sem confusão</h3><p>Aulas gratuitas nem sempre incluem certificado gratuito. Essa diferença aparece em cada curso.</p></div><div><h3>Você decide o que compartilhar</h3><p>Explore sem se identificar. A avaliação acadêmica é opcional e fica separada da busca.</p></div></section>`,
  );
}
const stepTitles = [
  "O que deseja aprender?",
  "Qual é seu objetivo?",
  "Como está seu conhecimento?",
  "Quanto tempo cabe na sua semana?",
  "Como você vai estudar?",
  "Você precisa de certificado gratuito?",
];
const stepNames = [
  "Área de interesse",
  "Objetivo",
  "Conhecimento",
  "Tempo disponível",
  "Dispositivo",
  "Certificado",
];
const hints = [
  "Escolha uma área para esta busca. Você pode mudar depois.",
  "Escolha o que mais se aproxima do seu momento.",
  "Responda pensando na área escolhida, não na sua experiência geral.",
  "Uma estimativa realista ajuda a comparar carga horária e prazo.",
  "Considere o aparelho que estará disponível para fazer os exercícios.",
  "O conteúdo pode ser gratuito mesmo quando a emissão do certificado é paga.",
];
function choices(name, options, value) {
  return `<div class="choice-grid">${options.map(([v, label, sub]) => `<label class="choice"><input type="radio" name="${name}" value="${v}" ${String(value) === String(v) ? "checked" : ""} required><span><strong>${esc(label)}</strong>${sub ? `<small>${esc(sub)}</small>` : ""}</span></label>`).join("")}</div>`;
}
function question() {
  const p = state.profile,
    s = state.step;
  let input = "";
  if (s === 0)
    input = choices("area", Object.entries(state.catalog.areas), p.area);
  if (s === 1) input = choices("goal", Object.entries(goals), p.goal);
  if (s === 2) {
    input = choices(
      "level",
      [
        [0, "Estou começando", "Ainda não tenho experiência nesta área."],
        [
          1,
          "Já conheço o básico",
          "Consigo realizar algumas tarefas com orientação.",
        ],
        [
          2,
          "Já tenho experiência",
          "Realizo tarefas com autonomia e quero aprofundar.",
        ],
      ],
      p.level,
    );
    if (p.area === "sites" || p.area === "programacao" || p.area === "dados")
      input += `<div class="notice"><strong>Confirme apenas o que já sabe fazer</strong><p class="fine">Isso evita indicar uma continuação sem os conhecimentos necessários.</p>${Object.entries(
        state.catalog.skillLabels,
      )
        .filter(([k]) =>
          p.area === "dados" ? k.startsWith("excel") : k === "html",
        )
        .map(
          ([k, v]) =>
            `<label class="check"><input type="checkbox" name="skills" value="${k}" ${p.skills.includes(k) ? "checked" : ""}><span>${esc(v)}</span></label>`,
        )
        .join("")}</div>`;
  }
  if (s === 3)
    input = `<label class="field"><span>Horas por semana</span><input name="hours" type="number" min="0.5" max="40" step="0.5" value="${p.hours}" required aria-describedby="hours-help"></label><p id="hours-help" class="fine">Por exemplo: 3 horas podem ser distribuídas em três dias de uma hora. O prazo estimado não inclui tempo adicional de revisão.</p>`;
  if (s === 4)
    input = choices(
      "device",
      [
        [
          "computer",
          "Tenho acesso a um computador",
          "Também posso usar celular ou tablet.",
        ],
        [
          "mobile",
          "Tenho apenas celular ou tablet",
          "Vou priorizar conteúdos que não dependem de programas de computador.",
        ],
      ],
      p.device,
    );
  if (s === 5)
    input = choices(
      "freeCertificate",
      [
        [
          "false",
          "Não é obrigatório",
          "Posso estudar mesmo se o certificado for pago.",
        ],
        [
          "true",
          "Sim, preciso do certificado gratuito",
          "Indique somente cursos com emissão gratuita confirmada.",
        ],
      ],
      p.freeCertificate,
    );
  page(
    `<div class="form-layout"><aside class="rail"><p class="eyebrow">Encontre sua trilha</p><h1>Uma escolha<br>com a sua cara.</h1><p>Algumas respostas para conhecer seu momento e organizar as opções.</p><ol class="steps">${stepNames.map((n, i) => `<li class="${i === s ? "current" : i < s ? "done" : ""}" ${i === s ? 'aria-current="step"' : ""}><span>${i + 1}</span>${n}</li>`).join("")}</ol><p class="fine">As respostas desta busca não são gravadas no banco sem sua participação voluntária.</p></aside><form id="profile-form" class="form-panel"><div class="progress-label"><span>Seu perfil</span><span>Etapa ${s + 1} de 6</span></div><progress max="6" value="${s + 1}" aria-label="Etapa ${s + 1} de 6"></progress><fieldset><legend><h2>${stepTitles[s]}</h2></legend><p class="muted">${hints[s]}</p>${input}</fieldset><div class="form-actions"><button class="secondary" type="button" id="back">${s ? "Voltar" : "Início"}</button><button class="button" type="submit">${s === 5 ? "Ver minhas indicações" : "Continuar"} <span aria-hidden="true">→</span></button></div></form></div>`,
  );
  const form = document.querySelector("#profile-form");
  document.querySelector("#back").onclick = () => {
    if (s) {
      saveStep(form, false);
      state.step--;
      question();
    } else goto("inicio");
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    saveStep(form, true);
    if (s < 5) {
      state.step++;
      question();
    } else {
      try {
        await busy(form.querySelector("[type=submit]"), async () => {
          state.recommendations = await api("/recommend", {
            method: "POST",
            body: state.profile,
          });
          state.participation = null;
          state.token = null;
          state.pendingToken = null;
          goto("resultados");
        });
      } catch (err) {
        errorIn(form, err);
      }
    }
  };
}
function saveStep(form) {
  const d = new FormData(form),
    s = state.step,
    p = state.profile;
  if (s === 0 && d.has("area")) {
    if (p.area !== d.get("area")) p.skills = [];
    p.area = d.get("area");
  }
  if (s === 1 && d.has("goal")) p.goal = d.get("goal");
  if (s === 2) {
    p.level = Number(d.get("level"));
    p.skills = d.getAll("skills");
  }
  if (s === 3) p.hours = Number(d.get("hours"));
  if (s === 4 && d.has("device")) p.device = d.get("device");
  if (s === 5) p.freeCertificate = d.get("freeCertificate") === "true";
}
function card(c, r) {
  return `<article class="course"><div class="course-top"><p class="eyebrow">${esc(state.catalog.areas[c.area])}</p><h3>${esc(c.title)}</h3></div><div class="course-body"><div class="institution">${esc(c.institution)}</div><p>${esc(c.summary)}</p><div class="tags"><span class="tag">${c.hours} horas</span><span class="tag">${levels[c.level]}</span><span class="tag ${c.certificate === "free" ? "free" : ""}">Certificado ${c.certificate === "free" ? "gratuito" : c.certificate === "paid" ? "pago" : "não confirmado"}</span></div>${r ? `<strong class="fine">Por que aparece aqui</strong><ul class="reasons">${r.reasons.map((v) => `<li>${esc(v)}</li>`).join("")}</ul><div class="estimate">${esc(r.estimate)}</div>` : ""}<p class="fine">${c.deadlineDays ? `Prazo: ${c.deadlineDays} dias após a inscrição.` : "Prazo institucional não confirmado."}</p><div class="course-actions"><button class="button secondary" data-detail="${c.id}">Ver detalhes e requisitos</button><a class="button" data-course="${c.id}" href="${c.url}" target="_blank" rel="noopener noreferrer">Ir para o curso oficial <span aria-hidden="true">↗</span><span class="sr-only">(abre nova aba)</span></a></div></div></article>`;
}
function wireCourses() {
  main
    .querySelectorAll("[data-detail]")
    .forEach((b) => (b.onclick = () => details(b.dataset.detail)));
  main
    .querySelectorAll("[data-course]")
    .forEach((a) =>
      a.addEventListener("click", () => recordClick(a.dataset.course)),
    );
}
function recordClick(id) {
  if (
    state.participation &&
    state.token &&
    state.recommendations?.results.some((r) => r.course.id === id)
  ) {
    api("/click", {
      method: "POST",
      body: { token: state.token, courseId: id, eventId: uuid() },
    }).catch(() => {
      announce.textContent =
        "O curso abriu, mas o clique não pôde ser registrado na avaliação.";
    });
  }
}
function details(id) {
  const c = state.catalog.courses.find((c) => c.id === id);
  if (!c) return;
  document.querySelector("#dialog-content").innerHTML =
    `<p class="eyebrow">Ficha do curso</p><h2 id="dialog-title">${esc(c.title)}</h2><p>${esc(c.summary)}</p><dl><dt>Instituição e autoria</dt><dd>${esc(c.institution)} · ${esc(c.author)}</dd><dt>Nível e pré-requisitos</dt><dd>${levels[c.level]} — classificação da curadoria. ${esc(c.prerequisites)}</dd><dt>Carga horária e prazo</dt><dd>${c.hours} horas. ${esc(c.deadlineNote)}</dd><dt>Acesso e certificado</dt><dd>${esc(c.access)}</dd><dt>Dispositivo e recursos</dt><dd>${esc(c.deviceNote)}</dd><dt>Verificação</dt><dd>22/10/2026. ${esc(c.verification)}. As condições podem mudar.</dd></dl><div class="actions"><a class="button" id="dialog-official" href="${c.url}" target="_blank" rel="noopener noreferrer">Abrir página oficial ↗<span class="sr-only"> (nova aba)</span></a></div><p class="fine">O Trilha Gratuita não hospeda aulas nem tem parceria com a instituição.</p>`;
  document.querySelector("#dialog-official").onclick = () => recordClick(id);
  document.querySelector("#course-dialog").showModal();
}
document.querySelector("#close-dialog").onclick = () =>
  document.querySelector("#course-dialog").close();
function results() {
  if (!state.recommendations) return goto("perfil");
  const r = state.recommendations,
    p = r.profile;
  page(
    `${title("Suas possibilidades", r.results.length ? "Seu próximo curso pode estar aqui." : "Vamos tentar outro caminho?", esc(r.message))}<div class="result-summary"><span class="tag">${esc(state.catalog.areas[p.area])}</span><span class="tag">${levels[p.level]}</span><span class="tag">${p.hours} h/semana</span><span class="tag">${p.device === "computer" ? "Computador" : "Celular ou tablet"}</span><span class="tag">${p.freeCertificate ? "Certificado gratuito obrigatório" : "Certificado opcional"}</span></div><p><button class="text-link" id="adjust">Ajustar minhas respostas</button></p>${r.results.length ? `<div class="course-grid">${r.results.map((x) => card(x.course, x)).join("")}</div><div class="invite"><div><h2>Sua experiência pode melhorar este projeto.</h2><p>Se você tem 18 anos ou mais, pode participar da avaliação acadêmica. É opcional. Antes de enviar qualquer dado, explicamos o que será registrado.</p></div><a class="button light" href="#participar">${state.participation ? "Enviar feedback" : "Quero participar"}</a></div>` : `<div class="empty"><h2>Não encontramos uma combinação neste catálogo.</h2><p>Verifique o tempo disponível, o dispositivo e a necessidade de certificado. Mantenha respostas verdadeiras sobre seus conhecimentos.</p><p class="fine">Entre os cursos da área, foram excluídos por nível: ${r.excluded.level}; pré-requisitos: ${r.excluded.prerequisites}; dispositivo: ${r.excluded.device}; certificado: ${r.excluded.certificate}; prazo: ${r.excluded.deadline}. Cada curso aparece no primeiro motivo de exclusão.</p><a class="button secondary" href="#catalogo">Explorar todos os cursos</a></div>`}<p class="fine">A pontuação ordena opções por objetivo, nível e duração estimada. Não mede qualidade do curso nem probabilidade de aprendizagem. <a href="#sobre">Entenda os critérios.</a></p>`,
  );
  document.querySelector("#adjust").onclick = () => {
    state.step = 0;
    goto("perfil");
  };
  wireCourses();
}
function catalog() {
  page(
    `${title("Catálogo aberto", "Conhecimento para explorar.", "Compare cursos gratuitos e confira as condições na fonte oficial. O catálogo é uma seleção limitada, não uma lista de todos os cursos disponíveis.")}<form class="search-row" id="filters" role="search"><label class="field"><span>Buscar curso ou instituição</span><input type="search" name="q" value="${esc(state.filters.q)}" placeholder="Ex.: Python, Excel, segurança" autocomplete="off"></label><label class="field"><span>Área de interesse</span><select name="area"><option value="">Todas as áreas</option>${Object.entries(
      state.catalog.areas,
    )
      .map(
        ([k, v]) =>
          `<option value="${k}" ${state.filters.area === k ? "selected" : ""}>${esc(v)}</option>`,
      )
      .join(
        "",
      )}</select></label><label class="field"><span>Certificado</span><select name="certificate"><option value="">Todas as condições</option><option value="free" ${state.filters.certificate === "free" ? "selected" : ""}>Somente gratuito</option><option value="paid" ${state.filters.certificate === "paid" ? "selected" : ""}>Emissão paga</option></select></label></form><p class="result-count" id="count" role="status"></p><div id="catalog-results"></div>`,
  );
  const f = document.querySelector("#filters");
  const update = () => {
    state.filters = Object.fromEntries(new FormData(f));
    const norm = (s) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const rows = state.catalog.courses.filter(
      (c) =>
        (!state.filters.area || c.area === state.filters.area) &&
        (!state.filters.certificate ||
          c.certificate === state.filters.certificate) &&
        norm(c.title + " " + c.summary + " " + c.institution).includes(
          norm(state.filters.q),
        ),
    );
    document.querySelector("#count").textContent =
      `${rows.length} ${rows.length === 1 ? "curso encontrado" : "cursos encontrados"} · Verificação em 22/10/2026`;
    document.querySelector("#catalog-results").innerHTML = rows.length
      ? `<div class="course-grid">${rows.map((c) => card(c)).join("")}</div>`
      : '<div class="empty"><h2>Nenhum curso encontrado.</h2><p>Tente outro termo ou remova um filtro.</p></div>';
    wireCourses();
  };
  f.oninput = update;
  f.onsubmit = (e) => e.preventDefault();
  update();
}
function uuid() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16),
  );
}
function randomToken() {
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
function participate() {
  if (!state.recommendations?.results.length) return goto("perfil");
  if (state.participation) return feedback();
  page(
    `<div class="narrow">${title("Participação opcional", "Ajude a avaliar o Trilha Gratuita.", "Você pode continuar acessando os cursos sem preencher este formulário.")}<div class="notice"><p><strong>Antes de decidir</strong></p><p>Gabriel dos Santos usará seu nome ou nome de preferência, respostas ao perfil, cursos indicados, cliques feitos após o consentimento, feedback e horários para avaliar este projeto de ADS e preparar evidências para a faculdade. A faixa etária é opcional e não altera as indicações.</p><p>Os dados ficam no painel restrito. Evidências com nome, feedback e horários poderão ser apresentadas à avaliação acadêmica, sem publicação aberta. Comentários e nomes não aparecem no catálogo nem no GitHub.</p><p>Os registros identificados ficam disponíveis por até 90 dias. Você pode excluí-los antes com seu código privado ou pelo contato gbsantos.dev@gmail.com. <a href="#privacidade">Leia os detalhes sobre exclusão, exportações e cópias de segurança.</a></p></div>${!state.catalog.collectionReady ? '<div class="error" role="status">A coleta ainda não está configurada neste ambiente. A busca continua disponível; nenhum envio será apresentado como salvo.</div>' : ""}<form id="consent-form" class="form-panel"><label class="field"><span>Nome ou nome de preferência</span><input type="text" name="name" minlength="2" maxlength="80" required autocomplete="given-name"></label><label class="field"><span>Faixa etária (opcional)</span><select name="ageBand"><option value="">Prefiro não informar</option>${["18-24", "25-34", "35-44", "45-59", "60+"].map((x) => `<option value="${x}">${x} anos</option>`).join("")}</select></label><label class="check"><input type="checkbox" name="adult" required><span>Confirmo que tenho 18 anos ou mais.</span></label><label class="check"><input type="checkbox" name="consent" required><span>Li a finalidade da coleta e concordo voluntariamente com o registro e uso acadêmico descritos acima.</span></label><p class="fine">Menores de 18 anos podem explorar as recomendações sem participar desta coleta.</p><div class="actions"><button class="button" type="submit" ${!state.catalog.collectionReady ? "disabled" : ""}>Concordar e continuar</button><a href="#resultados">Continuar sem participar</a></div></form></div>`,
  );
  const f = document.querySelector("#consent-form");
  f.onsubmit = async (e) => {
    e.preventDefault();
    const d = new FormData(f);
    state.pendingToken ??= randomToken();
    try {
      await busy(f.querySelector("[type=submit]"), async () => {
        state.participation = await api("/participations", {
          method: "POST",
          body: {
            token: state.pendingToken,
            name: d.get("name"),
            ageBand: d.get("ageBand") || null,
            adult: d.has("adult"),
            consent: d.has("consent"),
            consentVersion: state.catalog.consentVersion,
            profile: state.recommendations.profile,
          },
        });
        state.token = state.pendingToken;
        feedback();
      });
    } catch (err) {
      errorIn(f, err);
    }
  };
}
function feedback() {
  page(
    `<div class="narrow">${title("Sua experiência", "As indicações fizeram sentido?", "Sua participação foi registrada no servidor. Conte o que ajudou e o que pode melhorar.")}<div class="notice"><p><strong>Guarde seu código privado de exclusão</strong></p><code class="token">${esc(state.token)}</code><p class="fine">Este código permite excluir seu registro. Não o compartilhe. Ele não fica salvo neste navegador após fechar ou recarregar a página.</p><button class="secondary" id="copy-token">Copiar código</button></div><form class="form-panel" id="feedback-form"><fieldset><legend><h2>As indicações combinam com seu objetivo?</h2></legend>${choices(
      "fit",
      [
        ["sim", "Sim"],
        ["parte", "Em parte"],
        ["nao", "Não"],
      ],
      null,
    )}</fieldset><label class="field"><span>O que ajudou ou o que poderia melhorar? (opcional)</span><textarea name="comment" maxlength="1500" placeholder="Não inclua documentos, senhas ou dados de outras pessoas."></textarea></label><p class="fine">Até 1.500 caracteres. Um novo envio nesta participação substitui o feedback anterior.</p><button class="button" type="submit">Enviar feedback</button></form><div class="actions"><a href="#resultados">Voltar aos cursos indicados</a><a href="#privacidade">Excluir minha participação</a></div></div>`,
  );
  document.querySelector("#copy-token").onclick = async (e) => {
    try {
      await navigator.clipboard.writeText(state.token);
      e.target.textContent = "Código copiado";
    } catch {
      e.target.textContent = "Selecione o código acima para copiar";
    }
  };
  const f = document.querySelector("#feedback-form");
  f.onsubmit = async (e) => {
    e.preventDefault();
    const d = new FormData(f);
    try {
      await busy(f.querySelector("[type=submit]"), async () => {
        const r = await api("/feedback", {
          method: "POST",
          body: {
            token: state.token,
            fit: d.get("fit"),
            comment: d.get("comment"),
          },
        });
        f.innerHTML = `<p class="eyebrow">Feedback salvo</p><h2>Obrigado por compartilhar sua experiência.</h2><p>Seu retorno ajuda a avaliar as indicações e orientar melhorias.</p><p class="fine">Confirmado pelo servidor: ${esc(formatDate(r.updated_at))}.</p><a class="button" href="#resultados">Voltar aos cursos</a>`;
      });
    } catch (err) {
      errorIn(f, err);
    }
  };
}
function privacy() {
  page(
    `<div class="narrow prose">${title("Transparência", "Seus dados, sua escolha.", "Política de participação acadêmica · versão 22/10/2026")}<h2>Responsável e finalidade</h2><p>Gabriel dos Santos, contato <a href="mailto:gbsantos.dev@gmail.com">gbsantos.dev@gmail.com</a>. O projeto Trilha Gratuita integra Atividades Extensionistas II de ADS, com referência local em Boituva e divulgação on-line no Brasil. A coleta serve à avaliação da utilidade das recomendações e à comprovação acadêmica da aplicação.</p><h2>Busca sem identificação</h2><p>Você pode explorar o catálogo e obter indicações sem nome, conta ou consentimento para a avaliação. As respostas são processadas pelo servidor para gerar as recomendações, mas não são gravadas no banco da avaliação sem consentimento. A aplicação não utiliza publicidade nem rastreadores analíticos de terceiros.</p><h2>Participação de adultos</h2><p>Somente quem confirma ter 18 anos ou mais e concorda expressamente participa da coleta. Registramos nome ou nome de preferência, faixa etária opcional, perfil, indicações, cliques posteriores ao consentimento e vinculados às indicações, feedback e horários do servidor. Idade não determina capacidade nem interesse. Não registramos matrícula ou conclusão no site de terceiros.</p><h2>Acesso e evidências</h2><p>Os dados ficam no painel restrito ao responsável. Evidências selecionadas podem ser entregues aos avaliadores da faculdade. O responsável pode ocultar nomes e comentários ao preparar capturas e deve evitar divulgação pública de dados identificáveis. Códigos e senhas não são incluídos nas exportações.</p><h2>Retenção e exclusão</h2><p>Registros identificados expiram em 90 dias da participação. Após o vencimento deixam de aparecer em consultas e são removidos na próxima rotina de limpeza: diária quando o agendamento da hospedagem estiver ativo, ou na próxima operação de coleta/painel. A exclusão remove também feedback e cliques vinculados.</p><p>O código privado permite excluir sem criar conta. Se perder o código, escreva ao responsável, que verificará sua solicitação. Exportações, capturas e materiais já entregues à faculdade não são apagados automaticamente pelo botão; o responsável deve tratar essas cópias separadamente, conforme as exigências acadêmicas. Cópias de segurança e logs dos provedores seguem as respectivas políticas e não têm eliminação instantânea garantida por este aplicativo.</p><h2>Segurança e infraestrutura</h2><p>O painel usa cookie de sessão restrito e temporário. Para limitar abusos, o servidor utiliza um identificador derivado do endereço de rede por até 15 minutos, sem gravar o endereço bruto no banco da avaliação. Provedores de hospedagem e banco podem manter logs técnicos próprios. Links oficiais levam a sites externos, com suas próprias regras e políticas.</p><form id="delete-self" class="form-panel"><h2>Excluir minha participação</h2><label class="field"><span>Código privado</span><input type="text" name="token" required minlength="43" maxlength="43" autocomplete="off" spellcheck="false" value="${esc(state.token || "")}"></label><label class="check"><input type="checkbox" required><span>Entendo que a exclusão do registro, feedback e cliques é definitiva.</span></label><button class="danger" type="submit">Excluir participação</button></form></div>`,
  );
  const f = document.querySelector("#delete-self");
  f.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await busy(f.querySelector("[type=submit]"), async () => {
        await api("/participation", {
          method: "DELETE",
          body: { token: new FormData(f).get("token").trim() },
        });
        state.participation = null;
        state.token = null;
        state.pendingToken = null;
        f.innerHTML =
          "<h2>Solicitação concluída.</h2><p>Se havia uma participação associada a esse código, ela foi excluída do banco ativo.</p>";
      });
    } catch (err) {
      errorIn(f, err);
    }
  };
}
function about() {
  page(
    `<div class="narrow prose">${title("O projeto", "Uma ponte para o conhecimento.", "Trilha Gratuita · Atividades Extensionistas II · Análise e Desenvolvimento de Sistemas")}<p>O projeto ajuda pessoas a localizar cursos gratuitos de terceiros compatíveis com objetivos, conhecimento, tempo e recursos disponíveis. Seu vínculo principal é com o ODS 4 — Educação de Qualidade.</p><h2>Como as indicações são escolhidas</h2><p>Primeiro filtramos a área, o nível e os pré-requisitos declarados. Cursos que dependem de computador não entram para quem tem apenas celular. Se o certificado gratuito for obrigatório, excluímos os pagos e os não confirmados.</p><p>Comparamos a carga horária com suas horas semanais e o prazo institucional conhecido. Se o ritmo informado exceder esse prazo, o curso não é indicado. Prazo desconhecido é sinalizado e deve ser conferido na instituição.</p><p>Entre os cursos elegíveis, a pontuação parte de 50 pontos: objetivo compatível soma 20; mesmo nível soma 15 (nível anterior, 5); estimativa de até 4 semanas soma 10 (até 8, 5); certificado gratuito soma 5. Empates usam menor carga e identificador do curso. Mostramos até três opções e os motivos.</p><p>A pontuação não é uma porcentagem de compatibilidade. Área, nível, objetivos e dispositivo são classificações da curadoria. Não usamos IA para decidir as recomendações nem usamos idade como critério.</p><h2>O que o projeto pode observar</h2><p>Participações voluntárias, cursos indicados, cliques e avaliação de utilidade. Esses dados não comprovam matrícula, conclusão de curso, emprego ou aprendizagem. Também não permitem contar pessoas únicas com certeza.</p><h2>Fontes e limites</h2><p>O catálogo inicial contém ${state.catalog.courses.length} cursos do Curso em Vídeo e da EV.G. Cada ficha traz fonte oficial, data e condições consultadas. Algumas páginas da EV.G foram verificadas por resultados indexados oficiais devido à indisponibilidade de abertura direta. Não houve teste completo das atividades externas em dispositivos móveis.</p><p>Não criamos aulas, não copiamos materiais didáticos e não representamos as instituições. O desenvolvimento teve assistência de IA; a avaliação e a aplicação na comunidade são responsabilidade do estudante.</p><div class="actions"><a class="button" href="#perfil">Encontrar um curso</a><a href="#privacidade">Como cuidamos dos dados</a></div></div>`,
  );
}
const formatDate = (s) =>
  s
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(s))
    : "—";
async function admin() {
  page(
    `${title("Área restrita", "Registros da avaliação", "Participações e cliques são registros de uso, não pessoas únicas, matrículas ou conclusões. Horários exibidos em Brasília.")}<div id="admin-content" class="loading" role="status">Consultando sessão…</div>`,
  );
  await loadAdmin();
}
function adminQuery() {
  const a = state.admin;
  return new URLSearchParams({
    mode: a.mode,
    hideNames: String(a.hideNames),
    hideComments: String(a.hideComments),
    page: String(a.page),
  });
}
async function loadAdmin() {
  const root = document.querySelector("#admin-content");
  if (!root) return;
  try {
    const data = await api("/admin/participations?" + adminQuery());
    if (!document.contains(root)) return;
    root.className = "";
    root.innerHTML = `<div class="admin-tools"><label>Ambiente <select id="admin-mode"><option value="real" ${state.admin.mode === "real" ? "selected" : ""}>Participações reais</option><option value="test" ${state.admin.mode === "test" ? "selected" : ""}>Somente testes</option></select></label><label class="check"><input id="hide-names" type="checkbox" ${state.admin.hideNames ? "checked" : ""}><span>Ocultar nomes</span></label><label class="check"><input id="hide-comments" type="checkbox" ${state.admin.hideComments ? "checked" : ""}><span>Ocultar comentários</span></label><button class="secondary" id="refresh-admin">Atualizar</button><button class="secondary" id="logout">Sair</button></div><div class="admin-stats"><div class="notice"><strong>${data.total}</strong>registros ${data.mode === "test" ? "de teste" : "de participação real"}</div><div class="notice">${data.mode === "test" ? "Não usar estes dados como evidências acadêmicas." : "Nomes podem se repetir. Não equivale ao total de pessoas únicas."}<br>Registros vencidos são excluídos automaticamente nas operações.</div></div><div class="actions"><button class="secondary" data-export="csv">Exportar CSV</button><button class="secondary" data-export="json">Exportar JSON</button></div><p class="fine">As exportações respeitam o ambiente e as opções de ocultação acima. Não compartilhe arquivos identificados publicamente.</p>${data.rows.length ? `<div class="table-wrap"><table><caption class="sr-only">Participações ${data.mode === "test" ? "de teste" : "reais"}</caption><thead><tr><th>Participação</th><th>Horário e consentimento</th><th>Perfil e recomendações</th><th>Feedback e cliques</th><th>Ações</th></tr></thead><tbody>${data.rows.map((r) => `<tr><td><strong>${esc(r.name)}</strong><br><small>${esc(r.id)}</small><br>${esc(r.age_band || "Faixa não informada")}</td><td>${esc(formatDate(r.created_at))}<br><small>Expira: ${esc(formatDate(r.expires_at))}<br>Consentimento: ${esc(r.consent_version)}</small></td><td><details><summary>Ver respostas e indicações</summary><pre>${esc(JSON.stringify(r.profile, null, 2))}</pre>${r.recommendations.map((x) => `<p><strong>${esc(x.course.title)}</strong><br>${esc(x.reasons.join(" "))}</p>`).join("")}<small>Catálogo ${esc(r.catalog_version)}</small></details></td><td>${r.fit ? { sim: "Sim", parte: "Em parte", nao: "Não" }[r.fit] : "Sem feedback"}<br>${r.comment ? esc(r.comment) : state.admin.hideComments ? "Comentário oculto" : ""}<br><small>Feedback: ${esc(formatDate(r.feedback_at))}</small><details><summary>${r.clicks} cliques registrados</summary>${r.click_events.map((c) => `<p>${esc(c.course_id)}<br>${esc(formatDate(c.created_at))}</p>`).join("") || "<p>Nenhum clique.</p>"}</details></td><td><button class="danger" data-delete="${r.id}">Excluir</button></td></tr>`).join("")}</tbody></table></div>` : '<div class="empty"><h2>Nenhum registro neste ambiente.</h2><p>Participações aparecerão aqui depois de envios reais e consentidos. Não há dados de demonstração misturados às evidências.</p></div>'}<div class="actions"><button class="secondary" id="prev-page" ${data.page <= 1 ? "disabled" : ""}>Anterior</button><span>Página ${data.page} de ${Math.max(1, Math.ceil(data.total / 25))}</span><button class="secondary" id="next-page" ${data.page * 25 >= data.total ? "disabled" : ""}>Próxima</button></div>`;
    document.querySelector("#admin-mode").onchange = (e) => {
      state.admin.mode = e.target.value;
      state.admin.page = 1;
      loadAdmin();
    };
    for (const [id, key] of [
      ["hide-names", "hideNames"],
      ["hide-comments", "hideComments"],
    ])
      document.querySelector("#" + id).onchange = (e) => {
        state.admin[key] = e.target.checked;
        loadAdmin();
      };
    document.querySelector("#refresh-admin").onclick = () => loadAdmin();
    document.querySelector("#prev-page").onclick = () => {
      state.admin.page--;
      loadAdmin();
    };
    document.querySelector("#next-page").onclick = () => {
      state.admin.page++;
      loadAdmin();
    };
    document.querySelector("#logout").onclick = async () => {
      try {
        await api("/admin/logout", { method: "POST", body: {} });
        admin();
      } catch (e) {
        errorIn(root, e);
      }
    };
    root.querySelectorAll("[data-delete]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (
            !confirm(
              "Excluir definitivamente esta participação, seu feedback e seus cliques?",
            )
          )
            return;
          try {
            await busy(b, () =>
              api("/admin/participations/" + b.dataset.delete, {
                method: "DELETE",
                body: {},
              }),
            );
            loadAdmin();
          } catch (e) {
            errorIn(root, e);
          }
        }),
    );
    root.querySelectorAll("[data-export]").forEach(
      (b) =>
        (b.onclick = async () => {
          try {
            await busy(b, async () => {
              const query = adminQuery();
              query.set("format", b.dataset.export);
              const r = await fetch("/api/admin/export?" + query, {
                credentials: "same-origin",
              });
              if (!r.ok) throw Error((await r.json()).error);
              const url = URL.createObjectURL(await r.blob()),
                a = document.createElement("a");
              a.href = url;
              a.download = `trilha-${state.admin.mode}.${b.dataset.export}`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            });
          } catch (e) {
            errorIn(root, e);
          }
        }),
    );
  } catch (e) {
    if (!document.contains(root)) return;
    root.className = "";
    if (e.status === 401) {
      root.innerHTML =
        '<form class="form-panel narrow" id="login-form"><h2>Acesso do responsável</h2><label class="field"><span>Senha administrativa</span><input name="password" type="password" required autocomplete="current-password"></label><button class="button" type="submit">Entrar no painel</button><p class="fine">Sessão válida por até oito horas. Não compartilhe sua senha.</p></form>';
      const f = document.querySelector("#login-form");
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        try {
          await busy(f.querySelector("button"), () =>
            api("/admin/login", {
              method: "POST",
              body: { password: new FormData(f).get("password") },
            }),
          );
          loadAdmin();
        } catch (err) {
          errorIn(f, err);
        }
      };
    } else {
      errorIn(root, e);
      const b = document.createElement("button");
      b.className = "secondary";
      b.textContent = "Tentar novamente";
      b.onclick = loadAdmin;
      root.append(b);
    }
  }
}
function render() {
  document.querySelector("#course-dialog").close();
  if (!state.catalog) return;
  const [route, area] = (location.hash.slice(1) || "inicio").split("/");
  document.title =
    ({
      inicio: "Encontre seu próximo curso",
      perfil: "Seu perfil",
      resultados: "Suas indicações",
      catalogo: "Catálogo",
      participar: "Avaliação acadêmica",
      admin: "Painel restrito",
      privacidade: "Privacidade",
      sobre: "O projeto",
    }[route] || "Início") + " · Trilha Gratuita";
  if (route === "catalogo" && area && state.catalog.areas[area])
    state.filters.area = area;
  (
    ({
      inicio: home,
      perfil: question,
      resultados: results,
      catalogo: catalog,
      participar: participate,
      privacidade: privacy,
      sobre: about,
      admin,
    })[route] || home
  )();
}
window.addEventListener("hashchange", render);
async function init() {
  try {
    state.catalog = await api("/catalog");
    const banner = document.querySelector("#mode-banner");
    if (state.catalog.mode === "test") {
      banner.hidden = false;
      banner.textContent =
        "Ambiente de teste — eventuais registros ficam separados e não contam como evidências reais.";
    }
    render();
  } catch (e) {
    page(
      '<div class="empty"><h1>Não foi possível carregar o catálogo.</h1><p>Tente novamente em instantes.</p><button class="button" id="retry">Tentar novamente</button></div>',
    );
    document.querySelector("#retry").onclick = init;
  }
}
init();
