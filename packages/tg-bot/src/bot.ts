import { Telegraf, Markup } from "telegraf";
import { getAdminFirestore } from "@prb/shared";
import type { Bill } from "@prb/shared";
import { saveSubscription, getSubscription } from "./notifications";

const BASE_WEB_URL = process.env.WEB_URL || "http://localhost:3001";

export function createBot(token: string): Telegraf {
  const bot = new Telegraf(token);

  // /start
  bot.start((ctx) => {
    ctx.replyWithMarkdown(
      `👋 *PRB — Законопроекты Госдумы*\n\n` +
      `Я слежу за изменениями статусов законопроектов и уведомляю вас.\n\n` +
      `*Команды:*\n` +
      `/bill <номер> — информация о законопроекте\n` +
      `/subscribe <номер> — подписаться на законопроект\n` +
      `/subscribeauthor <имя> — подписаться на законотворца\n` +
      `/mysubs — мои подписки\n` +
      `/unsubscribe <номер> — отписаться от законопроекта\n` +
      `/unsubscribeauthor <имя> — отписаться от автора\n` +
      `/help — справка`
    );
  });

  // /help
  bot.help((ctx) => ctx.reply(
    "Команды:\n" +
    "/bill 1169350-8 — карточка законопроекта\n" +
    "/subscribe 1169350-8 — уведомления при смене статуса\n" +
    "/subscribeauthor Иванов — уведомления по автору\n" +
    "/mysubs — список подписок\n" +
    "/unsubscribe 1169350-8 — отписаться"
  ));

  // /bill <id>
  bot.command("bill", async (ctx) => {
    const id = ctx.message.text.split(" ")[1]?.trim();
    if (!id) return ctx.reply("Укажите номер: /bill 1169350-8");

    try {
      const db = getAdminFirestore();
      const snap = await db.collection("bills").doc(id).get();
      if (!snap.exists) return ctx.reply(`Законопроект №${id} не найден в базе.`);

      const bill = snap.data() as Bill;
      const authors = (bill.authors || []).slice(0, 3).map((a) => a.name).join(", ");
      const regDate = typeof bill.registrationDate === "string"
        ? bill.registrationDate.slice(0, 10)
        : "";

      const text =
        `📋 *№${bill.id}*\n` +
        `${bill.title || ""}\n\n` +
        `Статус: *${bill.status || "—"}*\n` +
        `Зарегистрирован: ${regDate}\n` +
        (authors ? `Авторы: ${authors}\n` : "") +
        (bill.committees?.[0] ? `Комитет: ${bill.committees[0]}\n` : "") +
        `\n[Открыть на сайте](${BASE_WEB_URL}/bills/${id})`;

      await ctx.replyWithMarkdown(text, Markup.inlineKeyboard([
        Markup.button.callback("🔔 Подписаться", `sub_${id}`),
        Markup.button.url("Открыть", `${BASE_WEB_URL}/bills/${id}`),
      ]));
    } catch (err) {
      ctx.reply(`Ошибка: ${(err as Error).message}`);
    }
  });

  // /subscribe <id>
  bot.command("subscribe", async (ctx) => {
    const id = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!id) return ctx.reply("Укажите номер: /subscribe 1169350-8");

    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    await saveSubscription(chatId, userId, ctx.from.username, { addBillId: id });
    ctx.reply(`✅ Подписан на законопроект №${id}\nПришлю уведомление при смене статуса.`);
  });

  // /subscribeauthor <name>
  bot.command("subscribeauthor", async (ctx) => {
    const name = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!name) return ctx.reply("Укажите имя: /subscribeauthor Иванов.И.И.");

    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    await saveSubscription(chatId, userId, ctx.from.username, { addAuthor: name });
    ctx.reply(`✅ Подписан на законотворца: ${name}\nПришлю уведомления по его законопроектам.`);
  });

  // /unsubscribe <id>
  bot.command("unsubscribe", async (ctx) => {
    const id = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!id) return ctx.reply("Укажите номер: /unsubscribe 1169350-8");

    await saveSubscription(ctx.chat.id, ctx.from.id, ctx.from.username, { removeBillId: id });
    ctx.reply(`❌ Отписан от законопроекта №${id}`);
  });

  // /unsubscribeauthor <name>
  bot.command("unsubscribeauthor", async (ctx) => {
    const name = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!name) return ctx.reply("Укажите имя: /unsubscribeauthor Иванов.И.И.");

    await saveSubscription(ctx.chat.id, ctx.from.id, ctx.from.username, { removeAuthor: name });
    ctx.reply(`❌ Отписан от автора: ${name}`);
  });

  // /mysubs
  bot.command("mysubs", async (ctx) => {
    const sub = await getSubscription(ctx.from.id);
    if (!sub || (sub.billIds.length === 0 && sub.authorNames.length === 0)) {
      return ctx.reply("У вас нет подписок.\n\n/subscribe <номер> — подписаться на законопроект");
    }

    let msg = "📌 *Ваши подписки:*\n\n";
    if (sub.billIds.length > 0) {
      msg += `*Законопроекты:*\n${sub.billIds.map((id) => `• №${id}`).join("\n")}\n\n`;
    }
    if (sub.authorNames.length > 0) {
      msg += `*Авторы:*\n${sub.authorNames.map((n) => `• ${n}`).join("\n")}`;
    }
    ctx.replyWithMarkdown(msg);
  });

  // Inline button: subscribe
  bot.action(/^sub_(.+)$/, async (ctx) => {
    const id = ctx.match[1];
    await saveSubscription(ctx.chat!.id, ctx.from!.id, ctx.from?.username, { addBillId: id });
    ctx.answerCbQuery(`✅ Подписан на №${id}`);
  });

  return bot;
}
