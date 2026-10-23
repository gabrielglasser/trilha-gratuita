import { createApp } from "./app.js";
const portIndex = process.argv.indexOf("--port");
const port = Number(
  portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 3000,
);
createApp().listen(port, "0.0.0.0", () =>
  console.log(
    `Trilha Gratuita disponível na porta ${port}. Modo: ${process.env.DATA_MODE === "real" ? "real" : "teste"}.`,
  ),
);
