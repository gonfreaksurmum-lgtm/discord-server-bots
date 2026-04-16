// ============================================================================
// WALL OF FAME / SHAME
// ----------------------------------------------------------------------------
// Backward compatible: still exports postFame(channel, user, reason) and
// postShame(channel, user, reason). Now also persists entries so they can be
// listed later, and writes nicer embeds.
// ============================================================================

const { EmbedBuilder } = require("discord.js");
const { db } = require("../database/db");
const { isEnabled } = require("./featureToggles");

function insertEntry({ guildId, board, userId, reason, addedBy }) {
  db.prepare(`
    INSERT INTO fame_entries (guild_id, board, user_id, reason, added_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(guildId, board, userId, reason || null, addedBy, Date.now());
}

function listEntries(guildId, board, limit = 10, offset = 0) {
  return db.prepare(`
    SELECT * FROM fame_entries
    WHERE guild_id = ? AND board = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(guildId, board, limit, offset);
}

function countEntries(guildId, board) {
  const row = db.prepare(
    "SELECT COUNT(*) AS c FROM fame_entries WHERE guild_id = ? AND board = ?"
  ).get(guildId, board);
  return row?.c || 0;
}

function deleteEntry(id, guildId) {
  return db.prepare("DELETE FROM fame_entries WHERE id = ? AND guild_id = ?").run(id, guildId);
}

async function postFame(channel, user, reason = "No reason provided") {
  if (!isEnabled(channel.guild.id, "wallOfFame")) {
    return channel.send(`🌟 ${user} was added to the wall of fame. Reason: ${reason}`);
  }
  insertEntry({ guildId: channel.guild.id, board: "fame", userId: user.id, reason, addedBy: "legacy" });
  const embed = new EmbedBuilder()
    .setColor("#FBBF24")
    .setTitle("🌟 Wall of Fame")
    .setDescription(`${user} earned their spot.`)
    .addFields({ name: "Reason", value: reason })
    .setTimestamp();
  return channel.send({ embeds: [embed] });
}

async function postShame(channel, user, reason = "No reason provided") {
  if (!isEnabled(channel.guild.id, "wallOfFame")) {
    return channel.send(`💀 ${user} was added to the wall of shame. Reason: ${reason}`);
  }
  insertEntry({ guildId: channel.guild.id, board: "shame", userId: user.id, reason, addedBy: "legacy" });
  const embed = new EmbedBuilder()
    .setColor("#991B1B")
    .setTitle("💀 Wall of Shame")
    .setDescription(`${user} earned this one.`)
    .addFields({ name: "Reason", value: reason })
    .setTimestamp();
  return channel.send({ embeds: [embed] });
}

module.exports = { postFame, postShame, insertEntry, listEntries, countEntries, deleteEntry };
