export const areas = {
  digital: "Informática e segurança digital",
  trabalho: "Ferramentas para trabalho",
  programacao: "Programação",
  sites: "Criação de sites",
  dados: "Dados e planilhas",
};
const verifiedAt = "2026-10-22";
const cev = (id, title, slug, area, hours, summary, extra = {}) => ({
  id,
  title,
  institution: "Curso em Vídeo",
  author: "Gustavo Guanabara",
  url: `https://www.cursoemvideo.com/curso/${slug}/`,
  area,
  hours,
  summary,
  level: 0,
  requires: [],
  prerequisites:
    "Não exige experiência na área; familiaridade básica com o dispositivo ajuda.",
  device: "computer",
  deviceNote:
    "Computador recomendado para acompanhar os exercícios. A compatibilidade de todas as atividades em celular não foi verificada.",
  goals: ["zero", "trabalho", "projeto"],
  certificate: "paid",
  access:
    "Aulas gratuitas. Cadastro gratuito para acompanhar pela plataforma; certificado depende de créditos pagos e aprovação.",
  deadlineDays: null,
  deadlineNote:
    "Prazo de conclusão não identificado na página consultada. Confirme ao se inscrever.",
  verifiedAt,
  verification: "Página oficial consultada",
  ...extra,
});
const evg = (id, title, n, area, hours, summary, extra = {}) => ({
  id,
  title,
  institution: "Escola Virtual de Governo — EV.G",
  author: "Consultar conteudista na página oficial",
  url: `https://www.escolavirtual.gov.br/curso/${n}`,
  area,
  hours,
  summary,
  level: 0,
  requires: [],
  prerequisites:
    "Confira os requisitos de matrícula e avaliação na página oficial.",
  device: "computer",
  deviceNote:
    "Computador recomendado para as atividades práticas; compatibilidade integral com celular não confirmada.",
  goals: ["zero", "trabalho"],
  certificate: "free",
  access:
    "Curso aberto e gratuito, com cadastro na EV.G. Certificado gratuito condicionado aos requisitos de conclusão e avaliação da instituição.",
  deadlineDays: 30,
  deadlineNote:
    "30 dias de disponibilidade a partir da inscrição. Confirme a turma antes da matrícula.",
  verifiedAt,
  verification:
    "Dados consultados em resultados indexados das páginas oficiais; a abertura direta retornou indisponibilidade nesta consulta.",
  ...extra,
});
export const courses = [
  cev(
    "seguranca-cev",
    "Segurança da Informação — Módulo 00",
    "seguranca-da-informacao-modulo-00",
    "digital",
    20,
    "Introdução aos riscos da vida digital e aos cuidados para proteger informações.",
    {
      author: "Curso em Vídeo; conteúdo baseado na cartilha CERT.br/NIC.br",
      device: "mobile",
      deviceNote:
        "Conteúdo introdutório em vídeo, selecionado para estudo pelo celular. Reprodução e atividades dependem do navegador e da plataforma; não houve teste de matrícula.",
    },
  ),
  cev(
    "linux",
    "Linux",
    "linux",
    "digital",
    40,
    "Primeiros passos no sistema Linux, instalação e comandos do terminal.",
  ),
  cev(
    "word",
    "Word",
    "word",
    "trabalho",
    40,
    "Organização de documentos, formatação e recursos do editor de textos.",
    {
      deviceNote:
        "Computador com acesso ao Word para reproduzir as aulas. O curso não fornece licença do programa.",
    },
  ),
  cev(
    "excel-cev",
    "Excel",
    "excell",
    "dados",
    40,
    "Criação de planilhas e uso de fórmulas para organizar informações.",
    {
      deviceNote:
        "Computador com acesso ao Excel para praticar. O curso não fornece licença do programa.",
    },
  ),
  cev(
    "algoritmos",
    "Algoritmos e Lógica de Programação",
    "curso-de-algoritmo",
    "programacao",
    40,
    "Construção do raciocínio necessário para escrever e testar programas.",
  ),
  cev(
    "python1",
    "Python 3 — Mundo 1",
    "python-3-mundo-1",
    "programacao",
    40,
    "Primeiros programas em Python, operações com dados e condições.",
  ),
  cev(
    "javascript",
    "JavaScript",
    "javascript",
    "programacao",
    40,
    "Fundamentos da linguagem e exercícios de interação em páginas web.",
    {
      requires: ["html"],
      prerequisites:
        "Para esta indicação, confirme noções de HTML e CSS. Critério conservador da curadoria para os exercícios no navegador.",
    },
  ),
  cev(
    "html1",
    "HTML5 e CSS3 — Módulo 1",
    "html5-css3-modulo1",
    "sites",
    40,
    "Estrutura de páginas, conteúdo multimídia e primeiros estilos com CSS.",
  ),
  cev(
    "git",
    "Git e GitHub",
    "curso-de-git-e-github",
    "trabalho",
    20,
    "Controle de versões, repositórios e colaboração em projetos de código.",
    {
      goals: ["projeto", "trabalho"],
      prerequisites:
        "Não é necessário saber programar, segundo a página oficial.",
    },
  ),
  cev(
    "mysql",
    "MySQL",
    "mysql",
    "dados",
    40,
    "Introdução a tabelas, consultas SQL e organização de bancos relacionais.",
  ),
  cev(
    "html2",
    "HTML5 e CSS3 — Módulo 2",
    "curso-html5-e-css3-modulo-2-de-5-40-horas",
    "sites",
    40,
    "Continuação dos estudos de CSS e da organização visual de páginas.",
    {
      level: 1,
      requires: ["html"],
      prerequisites: "Módulo 1 ou conhecimento equivalente de HTML e CSS.",
      goals: ["trabalho", "projeto"],
    },
  ),
  evg(
    "seguranca-evg",
    "Segurança da Informação para Todos",
    1256,
    "digital",
    24,
    "Cuidados com dados, dispositivos e ameaças comuns no uso da internet.",
    {
      author:
        "Secretaria de Governo Digital e Escola Superior de Redes/RNP; certificação Enap",
      device: "mobile",
      deviceNote:
        "Selecionado por abordar cuidados cotidianos, sem programação. Compatibilidade integral das atividades no celular não confirmada.",
    },
  ),
  evg(
    "excel-intro",
    "Introdução ao Excel",
    459,
    "dados",
    25,
    "Primeiro contato com planilhas, formatação e apresentação de dados.",
    {
      author:
        "Secretaria Especial da Receita Federal do Brasil; certificação Enap",
      deviceNote:
        "Computador com Excel recomendado para prática. Licença do programa não incluída.",
    },
  ),
  evg(
    "excel-inter",
    "Excel Intermediário",
    1275,
    "dados",
    30,
    "Aprofundamento em funções, gráficos e organização de relatórios.",
    {
      author:
        "Secretaria Especial da Receita Federal do Brasil; certificação Enap",
      level: 1,
      requires: ["excel-basico"],
      prerequisites:
        "Domínio de operações básicas, células e fórmulas no Excel.",
      goals: ["trabalho", "projeto"],
    },
  ),
  evg(
    "excel-avancado",
    "Excel Avançado",
    1274,
    "dados",
    30,
    "Recursos avançados para análise e automação de tarefas em planilhas.",
    {
      author:
        "Secretaria Especial da Receita Federal do Brasil; certificação Enap",
      level: 2,
      requires: ["excel-intermediario"],
      prerequisites:
        "Domínio do Excel intermediário, incluindo funções e análise de planilhas.",
      goals: ["trabalho", "projeto"],
    },
  ),
  evg(
    "dados-conceitos",
    "Introdução à Ciência de Dados — Conceitos e Ferramentas",
    976,
    "dados",
    4,
    "Visão inicial das etapas e das ferramentas usadas em ciência de dados.",
    {
      author: "Serviço Federal de Processamento de Dados; certificação Enap",
      level: 1,
      prerequisites:
        "Curadoria recomenda familiaridade com dados e informática; público indicado inclui analistas de sistemas e suporte.",
    },
  ),
];
export const catalogVersion = "2026-10-22.1";
export const skillLabels = {
  html: "Sei criar uma página básica com HTML e CSS",
  "excel-basico": "Sei usar células e fórmulas básicas no Excel",
  "excel-intermediario": "Domino funções e recursos intermediários do Excel",
};
