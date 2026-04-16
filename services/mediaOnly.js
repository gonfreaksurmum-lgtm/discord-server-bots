// ============================================================================
// MEDIA-ONLY CHANNELS
// ----------------------------------------------------------------------------
// In configured channels, messages without media (image/video/link) get
// removed. The author gets a quick DM with the reason.
// ============================================================================

const { db } = require("../database/db");
const { isEnabled } = require("./featureToggles");

const MEDIA_EXT = /\.(png|jpe?g|gif|webp|mp4|mov|webm|avi|mkv|mp3|wav|ogg|flac)$/i;
const URL_RE = /https?:\/\/\S+/i;
const GIF_HOSTS = /(tenor\.com|giphy\.com|imgur\.com)/i;

function addChannel({ channelId, guildId, allowLinks, allowGifs }) {
  db.prepare(`
    INSERT INTO media_only_channels (channel_id, guild_id, allow_links, allow_gifs, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(channel_id) DO UPDATE SET
      allow_links = excluded.allow_links,
      allow_gifs = excluded.allow_gifs
  `).run(channelId, guildId, allowLinks ? 1 : 0, allowGifs ? 1 : 0, Date.now());
}

function removeChannel(channelId) {
  return db.prepare("DELETE FROM media_only_channels WHERE channel_id = ?").run(channelId);
}

function getConfig(channelId) {
  return db.prepare("SELECT * FROM media_only_channels WHERE channel_id = ?").get(channelId);
}

function listChannels(guildId) {
  return db.prepare("SELECT * FROM media_only_channels WHERE guild_id = ?").all(guildId);
}

function messageHasMedia(message, cfg) {
  // Attachments
  for (const att of message.attachments.values()) {
    if (att.contentType?.startsWith("image/")) return true;
    if (att.contentType?.startsWith("video/")) return true;
    if (att.contentType?.startsWith("audio/")) return true;
    if (MEDIA_EXT.test(att.name || "")) return true;
  }
  // Embeds (auto-embed from Discord is slow — tolerate)
  for (const emb of message.embeds) {
    if (emb.image || emb.video || emb.thumbnail) return true;
  }
  // Content-based
  const content = message.content || "";
  if (URL_RE.test(content)) {
    if (cfg.allow_links) return true;
    if (cfg.allow_gifs && GIF_HOSTS.test(content)) return true;
  }
  return false;
}

async function handleMessage(message) {
  if (!message.guild || message.author.bot) return;
  if (!isEnabled(message.guild.id, "mediaOnlyChannels")) return;

  const cfg = getConfig(message.channel.id);
  if (!cfg) return;

  if (messageHasMedia(message, cfg)) return;

  await message.delete().catch(() => {});
  await message.author.send(
    `Your message in **${message.guild.name}** #${message.channel.name} was removed — ` +
    `that channel is media-only.`
  ).catch(() => {});
}

module.exports = {
  addChannel,
  removeChannel,
  getConfig,
  listChannels,
  handleMessage,
  messageHasMedia,
};
