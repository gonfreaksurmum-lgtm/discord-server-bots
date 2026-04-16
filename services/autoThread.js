// ============================================================================
// AUTO-THREAD
// ----------------------------------------------------------------------------
// In configured channels, every non-bot message spawns a discussion thread.
// Useful for forum-style chatting in a non-forum channel.
// ============================================================================

const { db } = require("../database/db");
const { isEnabled } = require("./featureToggles");

function addAutoThreadChannel({ channelId, guildId, nameTemplate, archiveAfterMinutes, slowmode }) {
  db.prepare(`
    INSERT INTO auto_thread_channels
      (channel_id, guild_id, name_template, archive_after_minutes, slowmode_seconds, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(channel_id) DO UPDATE SET
      name_template = excluded.name_template,
      archive_after_minutes = excluded.archive_after_minutes,
      slowmode_seconds = excluded.slowmode_seconds
  `).run(
    channelId, guildId,
    nameTemplate || "Discussion: {title}",
    archiveAfterMinutes ?? 1440,
    slowmode ?? 0,
    Date.now()
  );
}

function removeAutoThreadChannel(channelId) {
  return db.prepare("DELETE FROM auto_thread_channels WHERE channel_id = ?").run(channelId);
}

function getAutoThreadConfig(channelId) {
  return db.prepare("SELECT * FROM auto_thread_channels WHERE channel_id = ?").get(channelId);
}

function listAutoThreadChannels(guildId) {
  return db.prepare("SELECT * FROM auto_thread_channels WHERE guild_id = ?").all(guildId);
}

async function handleMessage(message) {
  if (!message.guild || message.author.bot) return;
  if (!isEnabled(message.guild.id, "autoThread")) return;

  const cfg = getAutoThreadConfig(message.channel.id);
  if (!cfg) return;
  if (!message.startThread) return; // Not a text channel
  if (message.hasThread) return;

  const snippet = (message.content || "").slice(0, 80).replace(/\s+/g, " ").trim() || "New post";
  const name = cfg.name_template
    .replace("{title}", snippet)
    .replace("{user}", message.author.username)
    .slice(0, 100);

  const thread = await message.startThread({
    name,
    autoArchiveDuration: cfg.archive_after_minutes,
    reason: "Auto-thread",
  }).catch(() => null);

  if (thread && cfg.slowmode_seconds > 0) {
    await thread.setRateLimitPerUser(cfg.slowmode_seconds).catch(() => {});
  }
}

module.exports = {
  addAutoThreadChannel,
  removeAutoThreadChannel,
  getAutoThreadConfig,
  listAutoThreadChannels,
  handleMessage,
};
