import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { createBot } from "./bot";

const token = process.env.TG_BOT_TOKEN;
if (!token) {
  console.error("TG_BOT_TOKEN is not set in .env");
  process.exit(1);
}

const bot = createBot(token);

bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log("🤖 PRB Telegram bot started (polling)");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
