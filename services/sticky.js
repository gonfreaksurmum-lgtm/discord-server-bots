// ============================================================================
// STICKY MESSAGES
// ----------------------------------------------------------------------------
// Pins-like behavior for channels. When N messages arrive after the sticky,
// it gets deleted and reposted at the bottom. Implementation is rate-limited
// per channel to avoid thrashing.
// ============================================================================

const { EmbedBuilder } = require("discord.js");
const { db } = require("../database/db");
const { isEnabled } = require("./featureToggles");
const config = require("../config");

// In-memory counter so we repost every N messages instead of on every message.
const pendingCounts = new Map();  // channelId -> message count since last repost
const REPOST_EVERY = 5;

function setSticky(channelId, guildId, content) {
  db.prepare(`
    INSERT INTO sticky_messages (channel_id, guild_id, content, last_message_id, updated_at)
    VALUES (?, ?, ?, NULL, ?)
    ON CONFLICT(channel_id) DO UPDATE SET
      content = excluded.content,
      guild_id = excluded.guild_id,
      updated_at = excluded.updated_at
  `).run(channelId, guildId, content, Date.now());
}

function clearSticky(channelId) {
  return db.prepare("DELETE FROM sticky_messages WHERE channel_id = ?").run(channelId);
}

function getSticky(channelId) {
  return db.prepare("SELECT * FROM sticky_messages WHERE channel_id = ?").get(channelId);
}

function updateStickyMessageId(channelId, messageId) {
  db.prepare("UPDATE sticky_messages SET last_message_id = ?, updated_at = ? WHERE channel_id = ?")
    .run(messageId, Date.now(), channelId);
}

function buildStickyEmbed(content) {
  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle("📌 Sticky")
    .setDescription(content)
    .setFooter({ text: "This message stays at the bottom of the channel." });
}

async function handleMessage(message) {
  if (!message.guild || message.author.bot) return;
  if (!isEnabled(message.guild.id, "stickyMessages")) return;

  const sticky = getSticky(message.channel.id);
  if (!sticky) return;

  const key = message.channel.id;
  const count = (pendingCounts.get(key) || 0) + 1;
  pendingCounts.set(key, count);
  if (count < REPOST_EVERY) return;
  pendingCounts.set(key, 0);

  // Delete old sticky, post new one
  if (sticky.last_message_id) {
    const old = await message.channel.messages.fetch(sticky.last_message_id).catch(() => null);
    if (old) await old.delete().catch(() => {});
  }

  const sent = await message.channel.send({ embeds: [buildStickyEmbed(sticky.content)] }).catch(() => null);
  if (sent) updateStickyMessageId(message.channel.id, sent.id);
}

module.exports = { setSticky, clearSticky, getSticky, handleMessage, buildStickyEmbed };
