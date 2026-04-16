const { db } = require("./db");

function safeAlter(statement) {
  try {
    db.exec(statement);
  } catch {}
}

function runMigrations() {
  db.exec(`
    -- Phase 3
    CREATE TABLE IF NOT EXISTS fame_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      board TEXT NOT NULL CHECK (board IN ('fame', 'shame')),
      user_id TEXT NOT NULL,
      reason TEXT,
      added_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_fame_guild_board ON fame_entries (guild_id, board);

    CREATE TABLE IF NOT EXISTS sticky_messages (
      channel_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      content TEXT NOT NULL,
      last_message_id TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auto_responders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      trigger TEXT NOT NULL,
      reply TEXT NOT NULL,
      match_type TEXT NOT NULL DEFAULT 'contains'
        CHECK (match_type IN ('exact', 'contains', 'startsWith', 'regex')),
      case_sensitive INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_autoresp_guild ON auto_responders (guild_id);

    CREATE TABLE IF NOT EXISTS media_only_channels (
      channel_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      allow_links INTEGER NOT NULL DEFAULT 0,
      allow_gifs INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auto_thread_channels (
      channel_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name_template TEXT NOT NULL DEFAULT 'Discussion: {title}',
      archive_after_minutes INTEGER NOT NULL DEFAULT 1440,
      slowmode_seconds INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reaction_role_panels (
      message_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      mode TEXT NOT NULL DEFAULT 'multi'
        CHECK (mode IN ('multi', 'single', 'unique')),
      options_json TEXT NOT NULL DEFAULT '[]',
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS starboard_posts (
      source_message_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      starboard_message_id TEXT NOT NULL,
      star_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feature_toggles (
      guild_id TEXT NOT NULL,
      feature TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, feature)
    );

    CREATE TABLE IF NOT EXISTS channel_configs (
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      feature TEXT NOT NULL,
      config_json TEXT NOT NULL DEFAULT '{}',
      PRIMARY KEY (guild_id, channel_id, feature)
    );

    -- Phase 4
    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings (guild_id, user_id);

    CREATE TABLE IF NOT EXISTS temp_timeouts (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      expires_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS verification_panels (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS moderation_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_id TEXT,
      moderator_id TEXT,
      reason TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );

    -- Phase 5
    CREATE TABLE IF NOT EXISTS profiles (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      favorite_color TEXT,
      pronouns TEXT,
      banner TEXT,
      updated_at INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS reputation (
      guild_id TEXT NOT NULL,
      giver_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      value INTEGER NOT NULL DEFAULT 1,
      reason TEXT,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, giver_id, receiver_id, created_at)
    );
    CREATE INDEX IF NOT EXISTS idx_rep_receiver ON reputation (guild_id, receiver_id);

    CREATE TABLE IF NOT EXISTS afk_status (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT,
      set_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS marriages (
      guild_id TEXT NOT NULL,
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      married_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user1_id, user2_id)
    );

    -- Phase 6
    CREATE TABLE IF NOT EXISTS economy_balances (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      wallet INTEGER NOT NULL DEFAULT 0,
      bank INTEGER NOT NULL DEFAULT 0,
      last_daily INTEGER NOT NULL DEFAULT 0,
      last_work INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS shop_items (
      guild_id TEXT NOT NULL,
      item_key TEXT NOT NULL,
      item_type TEXT NOT NULL DEFAULT 'item',
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      role_id TEXT,
      stock INTEGER NOT NULL DEFAULT -1,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      PRIMARY KEY (guild_id, item_key)
    );

    CREATE TABLE IF NOT EXISTS inventories (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      item_key TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, user_id, item_key)
    );

    -- Phase 7
    CREATE TABLE IF NOT EXISTS custom_commands (
      guild_id TEXT NOT NULL,
      trigger TEXT NOT NULL,
      response TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, trigger)
    );

    CREATE TABLE IF NOT EXISTS saved_channel_templates (
      guild_id TEXT NOT NULL,
      template_key TEXT NOT NULL,
      name TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, template_key)
    );

    -- Phase 8
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      channel_id TEXT,
      guild_id TEXT,
      content TEXT NOT NULL,
      remind_at INTEGER NOT NULL,
      sent INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS birthdays (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS scheduled_announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      send_at INTEGER NOT NULL,
      sent INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL
    );

    -- Phase 9
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      answers_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invite_rewards (
      guild_id TEXT NOT NULL,
      invite_count INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, invite_count)
    );

    -- Phase 10
    CREATE TABLE IF NOT EXISTS achievements (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      earned_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id, code)
    );

    CREATE TABLE IF NOT EXISTS voice_activity (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      total_seconds INTEGER NOT NULL DEFAULT 0,
      joined_at INTEGER,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS jtc_configs (
      guild_id TEXT PRIMARY KEY,
      lobby_channel_id TEXT NOT NULL,
      category_id TEXT
    );

    -- Stability / polish
    CREATE TABLE IF NOT EXISTS ticket_claims (
      channel_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      claimer_id TEXT,
      reason TEXT,
      opened_at INTEGER NOT NULL,
      claimed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS giveaway_claim_tickets (
      giveaway_message_id TEXT NOT NULL,
      winner_id TEXT NOT NULL,
      ticket_channel_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (giveaway_message_id, winner_id)
    );
  `);

  safeAlter(`ALTER TABLE giveaways ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}'`);
  safeAlter(`ALTER TABLE giveaways ADD COLUMN winner_ids_json TEXT NOT NULL DEFAULT '[]'`);
  safeAlter(`ALTER TABLE giveaways ADD COLUMN ended_at INTEGER`);
  safeAlter(`ALTER TABLE tickets ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}'`);
}

module.exports = { runMigrations };
