import bcrypt from "bcryptjs";
import readline from "node:readline";
if (!process.stdin.isTTY)
  throw Error("Use terminal interativo; não forneça senha como argumento.");
process.stdout.write(
  "Nova senha administrativa (mínimo 14 caracteres; entrada oculta): ",
);
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
let secret = "";
process.stdin.on("keypress", async (s, key) => {
  if (key?.ctrl && key.name === "c") process.exit(1);
  if (key?.name === "return") {
    process.stdin.setRawMode(false);
    if (secret.length < 14) {
      console.error("\nUse ao menos 14 caracteres.");
      process.exit(1);
    }
    console.log("\nADMIN_PASSWORD_HASH=" + (await bcrypt.hash(secret, 12)));
    process.exit();
  } else if (key?.name === "backspace") secret = secret.slice(0, -1);
  else if (s && !key?.ctrl) secret += s;
});
