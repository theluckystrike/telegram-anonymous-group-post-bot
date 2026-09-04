import { BaseStore, FleetStats, now } from "./kit.ts";

export interface GroupRow { chat_id: number; title: string; salt: string; prefix: string; pro: number; created: number; }
export interface PostRow { id: number; chat_id: number; msg_id: number; sender_id: number; created: number; }

const QA_CHAT = -1001234567890;
const RETENTION_SEC = 30 * 86_400;
const PURGE_BATCH = 500; // bounded sweep per write

const SCHEMA = `
CREATE TABLE IF NOT EXISTS groups (chat_id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '', salt TEXT NOT NULL,
  prefix TEXT NOT NULL DEFAULT 'Anonymous', pro INTEGER NOT NULL DEFAULT 0, paid_charge TEXT, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS members (chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL, name TEXT NOT NULL DEFAULT '',
  last_seen INTEGER NOT NULL, PRIMARY KEY (chat_id, user_id));
CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER NOT NULL, msg_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL, body TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS posts_chat ON posts(chat_id, created);
CREATE INDEX IF NOT EXISTS posts_sender ON posts(chat_id, sender_id, created);
CREATE INDEX IF NOT EXISTS posts_created ON posts(created);
CREATE UNIQUE INDEX IF NOT EXISTS posts_msg ON posts(chat_id, msg_id);
CREATE TABLE IF NOT EXISTS sessions (user_id INTEGER PRIMARY KEY, chat_id INTEGER NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS bans (chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL, created INTEGER NOT NULL, PRIMARY KEY (chat_id, user_id));
CREATE TABLE IF NOT EXISTS admin_cache (chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL, status TEXT NOT NULL,
  checked INTEGER NOT NULL, PRIMARY KEY (chat_id, user_id));
CREATE TABLE IF NOT EXISTS sources (user_id INTEGER PRIMARY KEY, src TEXT NOT NULL, ts INTEGER NOT NULL);`;

const randSalt = (): string => crypto.randomUUID();

export class Store extends BaseStore {
  constructor(ctx: DurableObjectState, env: Record<string, unknown>) { super(ctx, env, SCHEMA); }

  async touchGroup(chatId: number, title: string): Promise<GroupRow> {
    this.run(`INSERT INTO groups (chat_id, title, salt, created) VALUES (?1, ?2, ?3, ?4)
              ON CONFLICT(chat_id) DO UPDATE SET title = ?2`, chatId, title, randSalt(), now());
    const row = this.one<GroupRow>("SELECT * FROM groups WHERE chat_id = ?1", chatId);
    if (!row) throw new Error("group upsert failed");
    return row;
  }
  async getGroup(chatId: number): Promise<GroupRow | null> { return this.one<GroupRow>("SELECT * FROM groups WHERE chat_id = ?1", chatId); }
  async setGroupPro(chatId: number, charge: string): Promise<void> { this.run("UPDATE groups SET pro = 1, paid_charge = ?2 WHERE chat_id = ?1", chatId, charge); }
  async setPrefix(chatId: number, prefix: string): Promise<void> { this.run("UPDATE groups SET prefix = ?2 WHERE chat_id = ?1", chatId, prefix); }

  async touchMember(chatId: number, userId: number, name: string): Promise<void> {
    this.run(`INSERT INTO members (chat_id, user_id, name, last_seen) VALUES (?1, ?2, ?3, ?4)
              ON CONFLICT(chat_id, user_id) DO UPDATE SET name = ?3, last_seen = ?4`, chatId, userId, name, now());
  }
  async memberName(chatId: number, userId: number): Promise<string | null> {
    return this.one<{ name: string }>("SELECT name FROM members WHERE chat_id = ?1 AND user_id = ?2", chatId, userId)?.name ?? null;
  }
  async groupsOf(userId: number): Promise<{ chat_id: number; title: string }[]> {
    return this.all("SELECT g.chat_id, g.title FROM groups g JOIN members m ON m.chat_id = g.chat_id WHERE m.user_id = ?1 ORDER BY m.last_seen DESC LIMIT 20", userId);
  }

  async addPost(chatId: number, msgId: number, senderId: number, body: string): Promise<number> {
    await this.purgeOldPosts();
    this.run("INSERT INTO posts (chat_id, msg_id, sender_id, body, created) VALUES (?1, ?2, ?3, ?4, ?5)", chatId, msgId, senderId, body, now());
    return this.lastId();
  }
  /** Post bodies are only kept for the Mini App's "my posts" view and are never used by /reveal.
   *  Bounded sweep (<= PURGE_BATCH rows) so this stays cheap on every write. */
  async purgeOldPosts(): Promise<void> {
    const cutoff = now() - RETENTION_SEC;
    const stale = this.all<{ id: number }>("SELECT id FROM posts WHERE created < ?1 LIMIT ?2", cutoff, PURGE_BATCH);
    for (const r of stale) this.run("DELETE FROM posts WHERE id = ?1", r.id);
  }
  async getPostByMsg(chatId: number, msgId: number): Promise<PostRow | null> {
    return this.one<PostRow>("SELECT * FROM posts WHERE chat_id = ?1 AND msg_id = ?2", chatId, msgId);
  }
  async postsLastHour(chatId: number, senderId: number): Promise<number> {
    return (this.one<{ n: number }>("SELECT COUNT(*) AS n FROM posts WHERE chat_id = ?1 AND sender_id = ?2 AND created > ?3", chatId, senderId, now() - 3600) ?? { n: 0 }).n;
  }
  async postsToday(chatId: number): Promise<number> {
    return (this.one<{ n: number }>("SELECT COUNT(*) AS n FROM posts WHERE chat_id = ?1 AND created > ?2", chatId, now() - 86_400) ?? { n: 0 }).n;
  }

  async setSession(userId: number, chatId: number): Promise<void> {
    this.run("INSERT INTO sessions (user_id, chat_id, created) VALUES (?1, ?2, ?3) ON CONFLICT(user_id) DO UPDATE SET chat_id = ?2, created = ?3", userId, chatId, now());
  }
  async getSession(userId: number): Promise<{ chat_id: number } | null> {
    return this.one("SELECT chat_id FROM sessions WHERE user_id = ?1 AND created > ?2", userId, now() - 3600);
  }
  async clearSession(userId: number): Promise<void> { this.run("DELETE FROM sessions WHERE user_id = ?1", userId); }

  async ban(chatId: number, userId: number): Promise<void> { this.run("INSERT OR IGNORE INTO bans (chat_id, user_id, created) VALUES (?1, ?2, ?3)", chatId, userId, now()); }
  async isBanned(chatId: number, userId: number): Promise<boolean> { return !!this.one("SELECT 1 AS x FROM bans WHERE chat_id = ?1 AND user_id = ?2", chatId, userId); }

  async cachedAdmin(chatId: number, userId: number): Promise<string | null> {
    const r = this.one<{ status: string }>("SELECT status FROM admin_cache WHERE chat_id = ?1 AND user_id = ?2 AND checked > ?3", chatId, userId, now() - 600);
    return r?.status ?? null;
  }
  async cacheAdmin(chatId: number, userId: number, status: string): Promise<void> {
    this.run(`INSERT INTO admin_cache (chat_id, user_id, status, checked) VALUES (?1, ?2, ?3, ?4)
              ON CONFLICT(chat_id, user_id) DO UPDATE SET status = ?3, checked = ?4`, chatId, userId, status, now());
  }

  async myPosts(userId: number): Promise<{ chat_id: number; body: string; created: number }[]> {
    return this.all("SELECT chat_id, body, created FROM posts WHERE sender_id = ?1 ORDER BY created DESC LIMIT 30", userId);
  }
  async groupTitle(chatId: number): Promise<string> { return this.one<{ title: string }>("SELECT title FROM groups WHERE chat_id = ?1", chatId)?.title ?? "Group"; }

  /** First-touch attribution for /start payloads like "site"/"share"/"list"/"x" (see logic.ts isSourcePayload). */
  async recordSource(userId: number, src: string): Promise<void> {
    this.run("INSERT OR IGNORE INTO sources (user_id, src, ts) VALUES (?1, ?2, ?3)", userId, src, now());
  }
  private sourceStats(): Record<string, number> {
    const rows = this.all<{ src: string; n: number }>(
      "SELECT src, COUNT(*) AS n FROM sources WHERE NOT (user_id BETWEEN 900000000 AND 900999999) GROUP BY src");
    const out: Record<string, number> = {};
    for (const r of rows) out["src_" + r.src] = r.n;
    return out;
  }

  async stats(): Promise<FleetStats> {
    const p = this.one<{ n: number }>("SELECT COUNT(*) AS n FROM posts WHERE chat_id != ?1 AND NOT (sender_id BETWEEN 900000000 AND 900999999)", QA_CHAT);
    const g = this.one<{ n: number; pr: number | null }>("SELECT COUNT(*) AS n, SUM(pro) AS pr FROM groups WHERE chat_id != ?1", QA_CHAT);
    const b = this.one<{ n: number }>("SELECT COUNT(*) AS n FROM bans WHERE chat_id != ?1", QA_CHAT);
    const u = this.userStats();
    const qg = this.one<{ n: number }>("SELECT COUNT(*) AS n FROM groups WHERE pro = 1 AND chat_id = ?1", QA_CHAT);
    return {
      ...u, qa_pro: u.qa_pro + (qg?.n ?? 0), pro: (g?.pr ?? 0) + u.pro, events: p?.n ?? 0, groups: g?.n ?? 0,
      bans: b?.n ?? 0, ...this.sourceStats(),
    };
  }
}
