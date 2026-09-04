import { Api, Bot, Context, InlineKeyboard } from "grammy";
import { Env as KitEnv, PRO_STARS, ProSpec, displayName, isPrivate, makeFetch, preparedShare, sendInvoice, wirePro } from "./kit.ts";
import { Store } from "./db.ts";
import { APP_HTML, buildShareText, validateInitData } from "./webapp.ts";
import { MAX_CHARS, dailyLimitReached, decodeChatId, encodeChatId, exceedsRate, hashSender, isSourcePayload, sanitize } from "./logic.ts";
import { resolveLang, t } from "./i18n.ts";
export { Store };

const BOT = "AnonSayProBot";
const FREE_PER_DAY = 20;
const RATE_PER_HOUR = 10;
interface Env extends KitEnv { STORE: DurableObjectNamespace<Store>; }
const store = (env: Env) => env.STORE.get(env.STORE.idFromName("main"));

const PRO: ProSpec = {
  title: "AnonSay Pro (this group)",
  description: "Unlimited anonymous posts and a custom prefix instead of 'Anonymous'. One-time payment, no subscription.",
  payload: "anonsay-pro",
  thanks: "✅ Pro unlocked for the group. Unlimited posts and /alias.\n\n/more — more free tools",
};
const helpText = (lang: string): string => t(lang, "help", { free: FREE_PER_DAY, rate: RATE_PER_HOUR, stars: PRO_STARS });
const MORE_TEXT = "More free tools by the same maker:\n🔒 @WhisperLockBot — locked messages only one person can open\n⏰ @NudgeRemindBot — reminders that arrive on time\n📮 @AnonInboxProBot — anonymous inbox via your link\n🧾 @SplitTabsBot — split group expenses\n🔥 @HabitStreakProBot — habit streaks with daily check-ins";
const SHARE_PITCH = "Post anonymous messages into your group — free.";
const shareUrl = (bot: string, pitch: string): string =>
  `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${bot}?start=share`)}&text=${encodeURIComponent(pitch)}`;

const proKb = (chatId: number, lang: string): InlineKeyboard =>
  new InlineKeyboard().url(t(lang, "btn_unlockProStars", { stars: PRO_STARS }), `https://t.me/${BOT}?start=pro_${encodeChatId(chatId)}`);

/** GroupPulse's / RSVP's shared convention: the id Telegram uses for "anonymous group admin" messages. */
const ANON_ADMIN_ID = 1087968824;

/** ctx.from, or null for channel posts, the anonymous-admin bot, and via_bot messages — never dereference ctx.from! directly. */
function realFrom(ctx: Context): NonNullable<Context["from"]> | null {
  const from = ctx.from;
  if (!from || from.id === ANON_ADMIN_ID) return null;
  if (ctx.message?.via_bot) return null;
  return from;
}

async function isGroupAdmin(ctx: Context, env: Env, chatId: number, userId: number): Promise<boolean> {
  const cached = await store(env).cachedAdmin(chatId, userId);
  if (cached) return cached === "creator" || cached === "administrator";
  const m = await ctx.api.getChatMember(chatId, userId).catch(() => null);
  if (!m) return false; // a transient API failure must not be cached as "member"
  await store(env).cacheAdmin(chatId, userId, m.status);
  return m.status === "creator" || m.status === "administrator";
}

type AnonCheck = { status: "ok"; text: string } | { status: "banned" | "rate" | "limit" | "empty" };

/** Read-only checks for an anonymous post: bans, rate limit, daily cap, sanitized content. No writes. */
async function checkAnon(env: Env, chatId: number, senderId: number, raw: string): Promise<AnonCheck> {
  if (await store(env).isBanned(chatId, senderId)) return { status: "banned" };
  if (exceedsRate(await store(env).postsLastHour(chatId, senderId), RATE_PER_HOUR)) return { status: "rate" };
  const group = (await store(env).getGroup(chatId)) ?? (await store(env).touchGroup(chatId, ""));
  if (dailyLimitReached(await store(env).postsToday(chatId), !!group.pro, FREE_PER_DAY)) return { status: "limit" };
  const text = sanitize(raw);
  if (!text) return { status: "empty" };
  return { status: "ok", text };
}

/** Writes the anonymous copy: call only after checkAnon returned "ok" (and, for the group path, after the original was deleted). */
async function commitAnon(env: Env, api: Api, chatId: number, senderId: number, text: string): Promise<void> {
  await store(env).track(senderId, "action");
  const group = await store(env).getGroup(chatId);
  const sent = await api.sendMessage(chatId, `🎭 ${group?.prefix ?? "Anonymous"}: ${text}`);
  await store(env).addPost(chatId, sent.message_id, senderId, text);
}

async function onAnonCommand(ctx: Context, env: Env): Promise<void> {
  if (isPrivate(ctx)) { await ctx.reply(helpText(resolveLang(ctx.from?.language_code)), { parse_mode: "Markdown" }); return; }
  const from = realFrom(ctx);
  if (!from) return;
  const chat = ctx.chat!;
  const text = String(ctx.match ?? "").trim();
  if (!text) { await ctx.reply("Usage: /anon your message"); return; }
  await store(env).touchGroup(chat.id, "title" in chat ? chat.title ?? "" : "");
  await store(env).touchMember(chat.id, from.id, from.first_name);
  const check = await checkAnon(env, chat.id, from.id, text);
  if (check.status === "ok") {
    // Anonymity must never be breakable: delete the original BEFORE posting the anonymous copy.
    const deleted = await ctx.deleteMessage().then(() => true).catch(() => false);
    if (!deleted) { await ctx.reply("Make me admin with delete permission so /anon stays anonymous."); return; }
    await commitAnon(env, ctx.api, chat.id, from.id, check.text);
    return;
  }
  if (check.status === "banned") { await ctx.deleteMessage().catch(() => null); return; } // silent drop, no anonymous copy
  if (check.status === "rate") { await ctx.reply(t(resolveLang(from.language_code), "rateLimited", { rate: RATE_PER_HOUR })); return; }
  if (check.status === "limit") {
    await store(env).track(from.id, "pro_prompt");
    await ctx.reply(t(resolveLang(from.language_code), "dailyLimitGroup", { free: FREE_PER_DAY, stars: PRO_STARS }), { reply_markup: proKb(chat.id, resolveLang(from.language_code)) });
    return;
  }
  await ctx.reply(t(resolveLang(from.language_code), "emptyAfterFilter"));
}

async function onReveal(ctx: Context, env: Env): Promise<void> {
  const from = realFrom(ctx);
  if (!from) return;
  const chat = ctx.chat!;
  const reply = ctx.message?.reply_to_message;
  if (isPrivate(ctx) || !reply) { await ctx.reply("Reply to an anonymous post with /reveal."); return; }
  if (!(await isGroupAdmin(ctx, env, chat.id, from.id))) { await ctx.reply("Only group admins can use /reveal."); return; }
  const post = await store(env).getPostByMsg(chat.id, reply.message_id);
  if (!post) { await ctx.reply("That is not a tracked anonymous post."); return; }
  const group = await store(env).getGroup(chat.id);
  const hash = await hashSender(post.sender_id, group?.salt ?? "");
  // Never the raw sender id or username — only the salted hash plus the first name we stored for reveal.
  const name = (await store(env).memberName(chat.id, post.sender_id)) ?? "unknown";
  await ctx.api.sendMessage(from.id, `🔍 Reveal for post #${post.id} in ${group?.title || "the group"}:\nHashed id: ${hash.slice(0, 16)}\nFirst name: ${name}`).catch(() => null);
  await ctx.reply("Sent you a DM with the details.");
}

async function onBan(ctx: Context, env: Env): Promise<void> {
  const from = realFrom(ctx);
  if (!from) return;
  const chat = ctx.chat!;
  const reply = ctx.message?.reply_to_message;
  if (isPrivate(ctx) || !reply) { await ctx.reply("Reply to an anonymous post with /ban."); return; }
  if (!(await isGroupAdmin(ctx, env, chat.id, from.id))) { await ctx.reply("Only group admins can use /ban."); return; }
  const post = await store(env).getPostByMsg(chat.id, reply.message_id);
  if (!post) { await ctx.reply("That is not a tracked anonymous post."); return; }
  await store(env).ban(chat.id, post.sender_id);
  await ctx.reply("🚫 That sender is now blocked in this group; future posts are dropped silently.");
}

async function onAlias(ctx: Context, env: Env): Promise<void> {
  const chat = ctx.chat!;
  if (isPrivate(ctx)) { await ctx.reply("Run /alias inside the group you want to rename."); return; }
  const group = await store(env).touchGroup(chat.id, "title" in chat ? chat.title ?? "" : "");
  if (!group.pro) { const lang = resolveLang(ctx.from?.language_code); await ctx.reply(t(lang, "aliasProOnly"), { reply_markup: proKb(chat.id, lang) }); return; }
  const prefix = String(ctx.match ?? "").trim().slice(0, 30);
  if (!prefix) { await ctx.reply("Usage: /alias 🦊 Fox"); return; }
  await store(env).setPrefix(chat.id, prefix);
  await ctx.reply(`Prefix set to "${prefix}". New posts will show "${prefix}: your text".`);
}

async function onStart(ctx: Context, env: Env): Promise<void> {
  const from = realFrom(ctx);
  if (!from) return;
  await store(env).touchUser(from.id, from.username, displayName(from));
  await store(env).track(from.id, "start");
  const lang = resolveLang(from.language_code);
  const arg = String(ctx.match ?? "");
  // Accept exactly what encodeChatId produces ("pro_" + decodeChatId's own m?\d+ grammar) and reject the rest;
  // on a bad/foreign payload fall through to the normal help flow instead of replying with nothing.
  const proMatch = arg.match(/^pro_(.+)$/);
  const chatId = proMatch ? decodeChatId(proMatch[1]) : null;
  if (chatId !== null) {
    const spec: ProSpec = { ...PRO, description: t(lang, "proDescription") };
    await sendInvoice(ctx, spec, "anonsay-pro:" + chatId);
    return;
  }
  if (isSourcePayload(arg)) await store(env).recordSource(from.id, arg);
  const addToGroupKb = (): InlineKeyboard => new InlineKeyboard().url(t(lang, "btn_addToGroup"), `https://t.me/${BOT}?startgroup=true`);
  const groups = await store(env).groupsOf(from.id);
  if (!groups.length) {
    const kb = addToGroupKb();
    if (isPrivate(ctx)) kb.row().url(t(lang, "btn_shareBot"), shareUrl(BOT, SHARE_PITCH));
    await ctx.reply(t(lang, "start", { free: FREE_PER_DAY }), { parse_mode: "Markdown", reply_markup: kb });
    return;
  }
  const kb = new InlineKeyboard();
  for (const g of groups) kb.text(g.title || "Group", `pick:${g.chat_id}`).row();
  kb.url(t(lang, "btn_addAnotherGroup"), `https://t.me/${BOT}?startgroup=true`);
  if (isPrivate(ctx)) kb.row().url(t(lang, "btn_shareBot"), shareUrl(BOT, SHARE_PITCH));
  await ctx.reply(t(lang, "start", { free: FREE_PER_DAY }), { parse_mode: "Markdown" });
  await ctx.reply(t(lang, "whichGroup"), { reply_markup: kb });
}

async function onPick(ctx: Context, env: Env, chatId: number): Promise<void> {
  const from = realFrom(ctx);
  if (!from) return;
  await store(env).setSession(from.id, chatId);
  await ctx.answerCallbackQuery();
  await ctx.reply(t(resolveLang(from.language_code), "typeMessage", { group: await store(env).groupTitle(chatId) }));
}

async function onPrivateText(ctx: Context, env: Env): Promise<void> {
  const from = realFrom(ctx);
  if (!from) return;
  const text = (ctx.message?.text ?? "").trim();
  if (text.startsWith("/")) return; // typos / unknown commands must never be relayed into the group
  await store(env).touchUser(from.id, from.username, displayName(from));
  const session = await store(env).getSession(from.id);
  if (!session) { await onStart(ctx, env); return; }
  if (text.length > MAX_CHARS) { await ctx.reply(`Too long: ${text.length}/${MAX_CHARS} characters.`); return; }
  const check = await checkAnon(env, session.chat_id, from.id, text);
  await store(env).clearSession(from.id);
  if (check.status === "rate") { await ctx.reply(t(resolveLang(from.language_code), "rateLimited", { rate: RATE_PER_HOUR })); return; }
  if (check.status === "limit") {
    await store(env).track(from.id, "pro_prompt");
    await ctx.reply(t(resolveLang(from.language_code), "dailyLimitPrivate", { stars: PRO_STARS }), { reply_markup: proKb(session.chat_id, resolveLang(from.language_code)) });
    return;
  }
  if (check.status === "empty") { await ctx.reply(t(resolveLang(from.language_code), "emptyAfterFilter")); return; }
  if (check.status === "ok") await commitAnon(env, ctx.api, session.chat_id, from.id, check.text);
  await ctx.reply("✅ Posted anonymously."); // deliberate anti-tell: a banned sender sees this same ack
}

function buildBot(env: Env): Bot {
  const bot = new Bot(env.BOT_TOKEN);
  const m = bot.on("message"); // message-only: channel posts have no ctx.from and must never reach a command handler
  m.command("start", (ctx) => onStart(ctx, env));
  m.command("help", (ctx) => ctx.reply(helpText(resolveLang(ctx.from?.language_code)), { parse_mode: "Markdown" }));
  m.command("anon", (ctx) => onAnonCommand(ctx, env));
  m.command("reveal", (ctx) => onReveal(ctx, env));
  m.command("ban", (ctx) => onBan(ctx, env));
  m.command("alias", (ctx) => onAlias(ctx, env));
  m.command("more", (ctx) => ctx.reply(MORE_TEXT));
  // Shadow wirePro's own /pro: this bot's Pro is per-group, so /pro must carry a chat id, and a group CTA
  // must be a URL deep-link button — never a Stars invoice sent straight into the group.
  m.command("pro", async (ctx) => {
    const from = realFrom(ctx);
    if (!from) return;
    const lang = resolveLang(from.language_code);
    if (isPrivate(ctx)) { await ctx.reply(t(lang, "proRunInGroup")); return; }
    await ctx.reply(t(lang, "proGroupInfo", { stars: PRO_STARS }), { reply_markup: proKb(ctx.chat!.id, lang) });
  });
  bot.callbackQuery(/^pick:(-?\d+)$/, (ctx) => onPick(ctx, env, Number(ctx.match[1])));
  wirePro(bot, PRO, async (ctx, payload, charge) => {
    const groupPayload = payload.match(/^anonsay-pro:(-?\d+)$/);
    const from = realFrom(ctx);
    if (groupPayload) { await store(env).setGroupPro(Number(groupPayload[1]), charge); }
    // Foreign/legacy payload: still upgrade the paying user rather than taking the Stars for nothing.
    else if (from) await store(env).setPro(from.id, charge);
    // kit.ts always sends its own (English) spec.thanks after onPaid resolves; for a non-English
    // payer we send a localized thank-you first so they get at least one message in their language.
    if (from) {
      const lang = resolveLang(from.language_code);
      if (lang !== "en") await ctx.reply(t(lang, "thankYou"));
    }
  }, (uid, s) => store(env).track(uid, s));
  bot.on("message:text", async (ctx) => {
    if (isPrivate(ctx)) { await onPrivateText(ctx, env); return; }
    const from = realFrom(ctx);
    if (from) await store(env).touchMember(ctx.chat.id, from.id, from.first_name);
  });
  return bot;
}

async function api(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t));
  if (!user) return Response.json({ error: "Open this page from Telegram." }, { status: 401 });
  const rows = await store(env).myPosts(user.id);
  const posts = [];
  for (const r of rows.slice(0, 30)) posts.push({ text: r.body, group: await store(env).groupTitle(r.chat_id), time: r.created });
  return Response.json({ posts });
}
/** POST /api/share: registers a Bot API "prepared" inline message (savePreparedInlineMessage)
 * so the Mini App can hand its id to tg.shareMessage(id) for a native chat/group/channel share. */
async function apiShare(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t));
  if (!user) return Response.json({ error: "Open this page from Telegram." }, { status: 401 });
  try {
    const share = await preparedShare(env, user.id, buildShareText(SHARE_PITCH, BOT, "shared"), `https://t.me/${BOT}`);
    await store(env).recordShare(user.id, "chat");
    return Response.json(share);
  } catch { return Response.json({ error: "Share unavailable." }, { status: 502 }); }
}

/** POST /api/share-story: records a "share to story" click. Telegram gives no server
 * callback for tg.shareToStory, so the client fires this right before calling it. */
async function apiShareStory(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t));
  if (!user) return Response.json({ error: "Open this page from Telegram." }, { status: 401 });
  await store(env).recordShare(user.id, "story");
  return Response.json({ ok: true });
}

const botFetch = makeFetch<Env>(buildBot, (env) => store(env).stats());
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const path = new URL(req.url).pathname;
    if (path === "/app") return new Response(APP_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    if (path === "/api/share" && req.method === "POST") return apiShare(req, env);
    if (path === "/api/share-story" && req.method === "POST") return apiShareStory(req, env);
    if (path === "/api/posts" && req.method === "POST") return api(req, env);
    return botFetch(req, env);
  },
};
