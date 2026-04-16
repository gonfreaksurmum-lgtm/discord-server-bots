const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "bot.sqlite"));

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS user_levels (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_roles (
  guild_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  PRIMARY KEY (guild_id, owner_id)
);

CREATE TABLE IF NOT EXISTS giveaways (
  message_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  host_id TEXT NOT NULL,
  prize TEXT NOT NULL,
  winner_count INTEGER NOT NULL DEFAULT 1,
  ends_at INTEGER NOT NULL,
  ended INTEGER NOT NULL DEFAULT 0,
  entry_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS suggestions (
  message_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  staff_note TEXT
);

CREATE TABLE IF NOT EXISTS tempbans (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  reason TEXT,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS snipes (
  channel_id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  content TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invite_cache (
  guild_id TEXT NOT NULL,
  code TEXT NOT NULL,
  uses INTEGER NOT NULL DEFAULT 0,
  inviter_id TEXT,
  PRIMARY KEY (guild_id, code)
);
`);

function getSettings(guildId) {
  const row = db.prepare("SELECT data FROM guild_settings WHERE guild_id = ?").get(guildId);
  if (!row) return {};
  try {
    return JSON.parse(row.data);
  } catch {
    return {};
  }
}

function setSettings(guildId, patch) {
  const current = getSettings(guildId);
  const next = { ...current, ...patch };
  db.prepare(`
    INSERT INTO guild_settings (guild_id, data)
    VALUES (?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET data = excluded.data
  `).run(guildId, JSON.stringify(next, null, 2));
  return next;
}

module.exports = { db, getSettings, setSettings };
