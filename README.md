# AnonSayProBot — anonymous group post bot for Telegram

**Try it:** [@AnonSayProBot](https://t.me/AnonSayProBot) · [tg.zovo.one/bots/anonsay/](https://tg.zovo.one/bots/anonsay/)

## What it does

AnonSayProBot lets anyone in a group send a message that posts as "Anonymous" instead of under their own name. Send `/anon` with your text, and the bot deletes your original message and reposts it under the group's anonymous prefix. Admins keep a safety valve: replying to an anonymous post with `/reveal` DMs them a hashed identifier and first name for that sender, and `/ban` silently blocks a sender's future anonymous posts. Free tier: 20 anonymous posts a day per group, 10 per hour per person, 500 characters max. Pro adds unlimited posts and a custom alias.

## Self-host

```bash
pnpm i
wrangler secret put BOT_TOKEN
wrangler secret put WEBHOOK_SECRET
wrangler deploy
curl "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=https://<your-worker>.workers.dev/webhook&secret_token=$WEBHOOK_SECRET"
```

The bot needs admin rights with delete permission in a group to keep posts anonymous.

## Stack

[grammY](https://grammy.dev/) on Cloudflare Workers, state in a Durable Object backed by SQLite, Pro upgrades billed with Telegram Stars.

---
Part of Tiny Telegram Tools — https://tg.zovo.one/
