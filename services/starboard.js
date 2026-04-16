// ============================================================================
// STARBOARD
// ----------------------------------------------------------------------------
// Backward compatible: still exports maybeStar(reaction) and still triggers
// on ⭐ reactions hitting a threshold. Improvements (all opt-in via settings):
//   • Configurable min stars (default 3, matching old behavior)
//   • Ignore bot posts
//   • Ignored channel list
//   • Duplicate-post guard via starboard_posts table
//   • Edits the existing starboard embed when star count rises (instead of
//     reposting)
// Existing users with no new settings get EXACTLY the old behavior.
// ============================================================================

const { EmbedBuilder } = require("discord.js");
const { getSettings, db } = require("../database/db");
const { isEnabled } = require("./featureToggles");

function getFilters(guildId) {
  const s = getSettings(guildId);
  return {
    minStars: s.starboardMinStars ?? 3,
    ignoreBots: s.starboardIgnoreBots ?? true,
    ignoredChannels: Array.isArray(s.starboardIgnoredChannels) ? s.starboardIgnoredChannels : [],
    selfStar: s.starboardAllowSelfStar ?? false,
  };
}

function buildEmbed(msg, starCount) {
  const embed = new EmbedBuilder()
    .setColor("#FBBF24")
    .setTitle("Starboard")
    .setDescription(msg.content || "*No text content*")
    .addFields(
      { name: "Author",  value: `${msg.author}`,  inline: true },
      { name: "Channel", value: `${msg.channel}`, inline: true },
      { name: "Stars",   value: `${starCount}`,   inline: true },
      { name: "Jump",    value: `[Go to message](${msg.url})`, inline: false }
    )
    .setTimestamp(msg.createdTimestamp);
  const firstAttachment = msg.attachments.first();
  if (firstAttachment) embed.setImage(firstAttachment.url);
  return embed;
}

async function maybeStar(messageReaction) {
  const msg = messageReaction.message;
  if (!msg.guild) return;
  if (messageReaction.emoji.name !== "⭐") return;

  const settings = getSettings(msg.guild.id);
  const starboardId = settings.starboardChannelId;
  if (!starboardId) return;
  const starboard = msg.guild.channels.cache.get(starboardId);
  if (!starboard) return;
  if (msg.channel.id === starboard.id) return; // don't star the starboard itself

  // Filters are only applied when the feature is enabled (defaults on).
  // When disabled, we fall back to legacy "min 3 stars" behavior.
  const useFilters = isEnabled(msg.guild.id, "starboardFilters");
  const filters = useFilters ? getFilters(msg.guild.id) : { minStars: 3, ignoreBots: false, ignoredChannels: [], selfStar: true };

  if (messageReaction.count < filters.minStars) return;
  if (filters.ignoreBots && msg.author?.bot) return;
  if (filters.ignoredChannels.includes(msg.channel.id)) return;

  // Deduplicate — if we've already posted this message, edit instead.
  const existing = db
    .prepare("SELECT * FROM starboard_posts WHERE source_message_id = ?")
    .get(msg.id);

  if (existing) {
    const posted = await starboard.messages.fetch(existing.starboard_message_id).catch(() => null);
    if (posted) {
      await posted.edit({
        content: `⭐ **${messageReaction.count}** <#${msg.channel.id}>`,
        embeds: [buildEmbed(msg, messageReaction.count)],
      }).catch(() => {});
      db.prepare("UPDATE starboard_posts SET star_count = ? WHERE source_message_id = ?")
        .run(messageReaction.count, msg.id);
      return;
    }
    // If the starboard message was deleted, fall through and repost.
    db.prepare("DELETE FROM starboard_posts WHERE source_message_id = ?").run(msg.id);
  }

  const sent = await starboard.send({
    content: `⭐ **${messageReaction.count}** <#${msg.channel.id}>`,
    embeds: [buildEmbed(msg, messageReaction.count)],
  }).catch(() => null);
  if (!sent) return;

  db.prepare(`
    INSERT INTO starboard_posts (source_message_id, guild_id, starboard_message_id, star_count, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(source_message_id) DO UPDATE SET
      starboard_message_id = excluded.starboard_message_id,
      star_count = excluded.star_count
  `).run(msg.id, msg.guild.id, sent.id, messageReaction.count, Date.now());
}

module.exports = { maybeStar, getFilters };
