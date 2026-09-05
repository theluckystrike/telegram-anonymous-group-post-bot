# AnonSayProBot — anonymous group post bot for Telegram

**Try it:** [@AnonSayProBot](https://t.me/AnonSayProBot?start=github) · [tg.zovo.one/bots/anonsay/](https://tg.zovo.one/bots/anonsay/)

## What it does

AnonSayProBot lets anyone in a group send a message that posts as "Anonymous" instead of under their own name. Send `/anon` with your text, and the bot deletes your original message and reposts it under the group's anonymous prefix. Admins keep a safety valve: replying to an anonymous post with `/reveal` DMs them a hashed identifier and first name for that sender, and `/ban` silently blocks a sender's future anonymous posts. Free tier: 20 anonymous posts a day per group, 10 per hour per person, 500 characters max. Pro adds unlimited posts and a custom alias.

## Use it without adding the bot

Type `@AnonSayProBot` in **any** Telegram chat, even one the bot has never been added to. It answers with a pitch card — posting anonymously into a chat the bot isn't a member of isn't something it can do, so this one's a pitch rather than a live answer.

Both **Inline Mode** and **Guest Chat Mode** need to be turned on for the bot in [@BotFather](https://t.me/BotFather) (Bot Settings → Mode Settings) — turn Inline Mode on first, then Guest Chat Mode. Without both, only the classic `@Bot query` inline surface works.

## Self-host

```bash
pnpm i
wrangler secret put BOT_TOKEN
wrangler secret put WEBHOOK_SECRET
wrangler deploy
curl -G "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  --data-urlencode "url=https://<your-worker>.workers.dev/webhook" \
  --data-urlencode "secret_token=$WEBHOOK_SECRET" \
  --data-urlencode 'allowed_updates=["message","callback_query","guest_message","inline_query","chosen_inline_result"]'
```

The bot needs admin rights with delete permission in a group to keep posts anonymous.

## Stack

[grammY](https://grammy.dev/) on Cloudflare Workers, state in a Durable Object backed by SQLite, Pro upgrades billed with Telegram Stars.

---
Part of Tiny Telegram Tools — https://tg.zovo.one/
