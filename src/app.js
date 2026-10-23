import express from "express";
import { z } from "zod";
import {
  randomUUID,
  randomBytes,
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { courses, areas, skillLabels } from "./catalog.js";
import { recommend, profileSchema } from "./recommend.js";
import { database, cleanup } from "./db.js";
export const consentVersion = "2026-10-22-v1";
const sha = (x) => createHash("sha256").update(x).digest("hex");
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const participationSchema = z
  .object({
    token: tokenSchema,
    name: z.string().trim().min(2).max(80),
    ageBand: z.enum(["18-24", "25-34", "35-44", "45-59", "60+"]).nullable(),
    adult: z.literal(true),
    consent: z.literal(true),
    consentVersion: z.literal(consentVersion),
    profile: profileSchema,
  })
  .strict();
const tokenBody = z.object({ token: tokenSchema }).strict();
function fail(status, message) {
  return Object.assign(new Error(message), { status });
}
export function csvCell(v) {
  let s = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
  if (/^[\s]*[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function createApp({ db = database, config = process.env } = {}) {
  const app = express();
  app.disable("x-powered-by");
  const origin = config.APP_ORIGIN || "http://localhost:3000",
    secure = origin.startsWith("https://");
  const mode = config.DATA_MODE === "real" ? "real" : "test";
  const configured = () =>
    !!(
      config.SESSION_SECRET?.length >= 32 &&
      config.ADMIN_PASSWORD_HASH &&
      config.DATABASE_URL
    );
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    });
    if (secure) res.set("Strict-Transport-Security", "max-age=31536000");
    if (req.path.startsWith("/api")) res.set("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "16kb" }));
  app.use("/api", (req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("origin") !== origin
    )
      return next(
        fail(403, "Origem não permitida. Reabra o site pelo endereço oficial."),
      );
    next();
  });
  const requireDB = async (req, res, next) => {
    if (!configured())
      throw fail(
        503,
        "A coleta ainda não está configurada. Você pode continuar buscando cursos sem participar.",
      );
    await cleanup(db);
    next();
  };
  const rate = (scope) => async (req, res, next) => {
    // Vercel sobrescreve x-vercel-forwarded-for. Fora dela, usa o socket, sem confiar em cabeçalho do cliente.
    const ip = config.VERCEL
      ? req.get("x-vercel-forwarded-for") || req.socket.remoteAddress
      : req.socket.remoteAddress;
    const key = createHmac("sha256", config.SESSION_SECRET)
      .update(scope + ":" + ip)
      .digest("hex");
    const r = await db.query(
      "INSERT INTO rate_limits(key,hits,expires_at) VALUES($1,1,CURRENT_TIMESTAMP + INTERVAL '15 minutes') ON CONFLICT(key) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits",
      [key],
    );
    if (r.rows[0].hits > (scope === "login" ? 8 : 80)) {
      res.set("Retry-After", "900");
      throw fail(
        429,
        "Muitas tentativas. Aguarde 15 minutos e tente novamente.",
      );
    }
    next();
  };
  async function participant(raw) {
    const token = tokenSchema.parse(raw);
    const r = await db.query(
      "SELECT * FROM participations WHERE token_hash=$1 AND expires_at>CURRENT_TIMESTAMP",
      [sha(token)],
    );
    if (!r.rows[0])
      throw fail(404, "Participação não encontrada ou já excluída.");
    return r.rows[0];
  }
  const auth = async (req, res, next) => {
    const token = (req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("tg_admin="))
      ?.slice(9);
    if (!token || !tokenSchema.safeParse(token).success)
      throw fail(401, "Entre no painel para continuar.");
    const r = await db.query(
      "SELECT token_hash FROM admin_sessions WHERE token_hash=$1 AND expires_at>CURRENT_TIMESTAMP",
      [sha(token)],
    );
    if (!r.rows.length) throw fail(401, "Sua sessão expirou. Entre novamente.");
    req.adminToken = token;
    next();
  };
  app.get("/api/catalog", (req, res) =>
    res.json({
      courses,
      areas,
      skillLabels,
      consentVersion,
      mode,
      collectionReady: configured(),
    }),
  );
  app.post("/api/recommend", (req, res) => res.json(recommend(req.body)));
  app.post(
    "/api/participations",
    requireDB,
    rate("collect"),
    async (req, res) => {
      const p = participationSchema.parse(req.body),
        r = recommend(p.profile);
      if (!r.results.length)
        throw fail(
          400,
          "Ajuste as respostas para obter recomendações antes de participar.",
        );
      const requestHash = sha(JSON.stringify({ ...p, token: undefined }));
      const inserted = await db.query(
        "INSERT INTO participations(id,token_hash,request_hash,name,age_band,profile,recommendations,catalog_version,consent_version,adult_confirmed,mode) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10) ON CONFLICT(token_hash) DO NOTHING RETURNING id,created_at,expires_at,mode",
        [
          randomUUID(),
          sha(p.token),
          requestHash,
          p.name,
          p.ageBand,
          JSON.stringify(r.profile),
          JSON.stringify(r.results),
          r.version,
          consentVersion,
          mode,
        ],
      );
      if (inserted.rows.length) return res.status(201).json(inserted.rows[0]);
      const existing = await participant(p.token);
      if (existing.request_hash !== requestHash)
        throw fail(
          409,
          "Este código já foi usado com outras respostas. Inicie uma nova participação.",
        );
      res.json({
        id: existing.id,
        created_at: existing.created_at,
        expires_at: existing.expires_at,
        mode: existing.mode,
        repeated: true,
      });
    },
  );
  app.post("/api/feedback", requireDB, rate("collect"), async (req, res) => {
    const b = z
        .object({
          token: tokenSchema,
          fit: z.enum(["sim", "parte", "nao"]),
          comment: z.string().trim().max(1500),
        })
        .strict()
        .parse(req.body),
      p = await participant(b.token);
    const r = await db.query(
      "INSERT INTO feedback(participation_id,fit,comment) VALUES($1,$2,$3) ON CONFLICT(participation_id) DO UPDATE SET fit=EXCLUDED.fit,comment=EXCLUDED.comment,updated_at=CURRENT_TIMESTAMP RETURNING updated_at",
      [p.id, b.fit, b.comment],
    );
    res.json({ saved: true, ...r.rows[0] });
  });
  app.post("/api/click", requireDB, rate("collect"), async (req, res) => {
    const b = z
        .object({
          token: tokenSchema,
          courseId: z.string().max(50),
          eventId: z.uuid(),
        })
        .strict()
        .parse(req.body),
      p = await participant(b.token);
    if (!p.recommendations.some((x) => x.course.id === b.courseId))
      throw fail(
        400,
        "Curso não pertence às recomendações desta participação.",
      );
    await db.query(
      "INSERT INTO clicks(event_id,participation_id,course_id) VALUES($1,$2,$3) ON CONFLICT(event_id) DO NOTHING",
      [b.eventId, p.id, b.courseId],
    );
    res.json({ saved: true });
  });
  app.delete(
    "/api/participation",
    requireDB,
    rate("collect"),
    async (req, res) => {
      const b = tokenBody.parse(req.body);
      await db.query("DELETE FROM participations WHERE token_hash=$1", [
        sha(b.token),
      ]);
      res.json({ deleted: true });
    },
  );
  app.post("/api/admin/login", requireDB, rate("login"), async (req, res) => {
    const b = z
      .object({ password: z.string().min(1).max(200) })
      .strict()
      .parse(req.body);
    if (!(await bcrypt.compare(b.password, config.ADMIN_PASSWORD_HASH)))
      throw fail(401, "Senha incorreta.");
    const token = randomBytes(32).toString("base64url");
    await db.query(
      "INSERT INTO admin_sessions(token_hash,expires_at) VALUES($1,CURRENT_TIMESTAMP + INTERVAL '8 hours')",
      [sha(token)],
    );
    res.cookie("tg_admin", token, {
      httpOnly: true,
      secure,
      sameSite: "strict",
      maxAge: 8 * 3600 * 1000,
      path: "/api/admin",
    });
    res.json({ authenticated: true });
  });
  app.post("/api/admin/logout", requireDB, auth, async (req, res) => {
    await db.query("DELETE FROM admin_sessions WHERE token_hash=$1", [
      sha(req.adminToken),
    ]);
    res.clearCookie("tg_admin", {
      httpOnly: true,
      secure,
      sameSite: "strict",
      path: "/api/admin",
    });
    res.json({ authenticated: false });
  });
  const filterSchema = z
    .object({
      mode: z.enum(["real", "test"]).default("real"),
      hideNames: z.enum(["true", "false"]).default("true"),
      hideComments: z.enum(["true", "false"]).default("true"),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      format: z.enum(["csv", "json"]).default("json"),
    })
    .strict();
  async function rowsFor(f, exporting = false) {
    const count = await db.query(
      "SELECT count(*)::int AS total FROM participations WHERE mode=$1 AND expires_at>CURRENT_TIMESTAMP",
      [f.mode],
    );
    if (exporting && count.rows[0].total > 10000)
      throw fail(
        422,
        "Mais de 10.000 registros. Exporte pelo banco com acesso restrito.",
      );
    const r = await db.query(
      `SELECT p.id,${f.hideNames === "true" ? "'Oculto'::text" : "p.name"} AS name,p.age_band,p.profile,p.recommendations,p.catalog_version,p.consent_version,p.mode,p.created_at,p.expires_at,f.fit,${f.hideComments === "true" ? "NULL::text" : "f.comment"} AS comment,f.updated_at AS feedback_at,(SELECT count(*)::int FROM clicks c WHERE c.participation_id=p.id) AS clicks,(SELECT COALESCE(jsonb_agg(jsonb_build_object('course_id',c.course_id,'created_at',c.created_at) ORDER BY c.created_at),'[]'::jsonb) FROM clicks c WHERE c.participation_id=p.id) AS click_events FROM participations p LEFT JOIN feedback f ON f.participation_id=p.id WHERE p.mode=$1 AND p.expires_at>CURRENT_TIMESTAMP ORDER BY p.created_at DESC,p.id LIMIT $2 OFFSET $3`,
      [f.mode, exporting ? 10000 : 25, exporting ? 0 : (f.page - 1) * 25],
    );
    return {
      rows: r.rows,
      total: count.rows[0].total,
      page: f.page,
      mode: f.mode,
    };
  }
  app.get("/api/admin/participations", requireDB, auth, async (req, res) =>
    res.json(await rowsFor(filterSchema.parse(req.query))),
  );
  app.get("/api/admin/export", requireDB, auth, async (req, res) => {
    const f = filterSchema.parse(req.query),
      r = await rowsFor(f, true);
    res.set(
      "Content-Disposition",
      `attachment; filename="trilha-${f.mode}.${f.format}"`,
    );
    if (f.format === "json")
      return res.json({
        exportedAt: new Date().toISOString(),
        ...r,
        notice:
          "Registros de participação, não pessoas únicas. Cliques não são matrículas.",
      });
    const keys = [
      "id",
      "name",
      "age_band",
      "mode",
      "created_at",
      "expires_at",
      "profile",
      "recommendations",
      "fit",
      "comment",
      "feedback_at",
      "clicks",
      "click_events",
      "consent_version",
      "catalog_version",
    ];
    res
      .type("text/csv; charset=utf-8")
      .send(
        "\uFEFF" +
          [
            keys.map(csvCell).join(";"),
            ...r.rows.map((row) => keys.map((k) => csvCell(row[k])).join(";")),
          ].join("\r\n"),
      );
  });
  app.delete(
    "/api/admin/participations/:id",
    requireDB,
    auth,
    async (req, res) => {
      const id = z.uuid().parse(req.params.id);
      await db.query("DELETE FROM participations WHERE id=$1", [id]);
      res.json({ deleted: true });
    },
  );
  app.get("/api/cron/cleanup", async (req, res) => {
    const expected = config.CRON_SECRET,
      actual = req.get("authorization")?.replace(/^Bearer /, "");
    if (
      !expected ||
      !actual ||
      actual.length !== expected.length ||
      !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
    )
      throw fail(401, "Não autorizado.");
    await cleanup(db);
    res.json({ cleaned: true });
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "Operação não encontrada." }),
  );
  app.use(express.static(fileURLToPath(new URL("../public", import.meta.url))));
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err instanceof z.ZodError)
      return res.status(400).json({
        error: "Confira os campos enviados.",
        fields: err.issues.map((x) => x.path.join(".")),
      });
    if (err.type === "entity.too.large")
      return res.status(413).json({ error: "Envio maior que o permitido." });
    if (err instanceof SyntaxError)
      return res.status(400).json({ error: "Dados inválidos." });
    res.status(err.status || 503).json({
      error: err.status
        ? err.message
        : "Não foi possível salvar ou consultar agora. Tente novamente. Nenhum sucesso foi confirmado.",
    });
  });
  return app;
}

// Entrada reconhecida pela hospedagem Express da Vercel.
export default createApp();
