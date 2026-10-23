import { z } from "zod";
import { courses, areas, catalogVersion } from "./catalog.js";
export const profileSchema = z
  .object({
    area: z.enum(Object.keys(areas)),
    goal: z.enum(["zero", "trabalho", "projeto"]),
    level: z.number().int().min(0).max(2),
    hours: z.number().min(0.5).max(40),
    device: z.enum(["computer", "mobile"]),
    freeCertificate: z.boolean(),
    skills: z
      .array(z.enum(["html", "excel-basico", "excel-intermediario"]))
      .max(3)
      .default([]),
  })
  .strict();
export function recommend(input, catalog = courses) {
  const p = profileSchema.parse(input),
    excluded = {
      area: 0,
      level: 0,
      prerequisites: 0,
      device: 0,
      certificate: 0,
      deadline: 0,
    };
  const matches = [];
  for (const c of catalog) {
    let why =
      c.area !== p.area
        ? "area"
        : c.level > p.level
          ? "level"
          : c.requires.some((s) => !p.skills.includes(s))
            ? "prerequisites"
            : p.device === "mobile" && c.device !== "mobile"
              ? "device"
              : p.freeCertificate && c.certificate !== "free"
                ? "certificate"
                : c.deadlineDays && (c.hours / p.hours) * 7 > c.deadlineDays
                  ? "deadline"
                  : null;
    if (why) {
      excluded[why]++;
      continue;
    }
    const weeks = Math.ceil(c.hours / p.hours),
      goal = c.goals.includes(p.goal),
      level = c.level === p.level;
    // Área, requisitos, certificado, dispositivo e prazo são filtros obrigatórios.
    const score =
      50 +
      (goal ? 20 : 0) +
      (level ? 15 : 5) +
      (weeks <= 4 ? 10 : weeks <= 8 ? 5 : 0) +
      (c.certificate === "free" ? 5 : 0);
    const reasons = [
      `Está na área de ${areas[p.area].toLowerCase()}.`,
      level
        ? "O nível corresponde à experiência informada."
        : "Pode ajudar a revisar fundamentos antes de avançar.",
    ];
    if (goal)
      reasons.push(
        {
          zero: "Apresenta fundamentos para começar.",
          trabalho: "Tem aplicação em habilidades para o trabalho.",
          projeto: "Inclui conhecimentos úteis para realizar um projeto.",
        }[p.goal],
      );
    if (p.freeCertificate)
      reasons.push(
        "A instituição informa certificado gratuito, mediante conclusão.",
      );
    const warnings = [c.deviceNote];
    if (!c.deadlineDays)
      warnings.push(
        "Prazo institucional não confirmado; confira antes da matrícula.",
      );
    matches.push({
      course: c,
      score,
      reasons,
      weeks,
      estimate: `Cerca de ${weeks} ${weeks === 1 ? "semana" : "semanas"} a ${p.hours} h/semana. Estimativa baseada na carga informada, sem tempo extra de revisão.`,
      warnings,
    });
  }
  matches.sort(
    (a, b) =>
      b.score - a.score ||
      a.course.hours - b.course.hours ||
      a.course.id.localeCompare(b.course.id),
  );
  return {
    version: catalogVersion,
    profile: p,
    results: matches.slice(0, 3),
    excluded,
    message: matches.length
      ? "Estas opções atendem aos critérios informados. Compare os detalhes e confirme as condições na instituição."
      : "O catálogo atual não tem curso que atenda a todos os critérios. Você pode ajustar as respostas ou explorar o catálogo; isso não significa que não existam cursos fora daqui.",
  };
}
