const { db, getSettings } = require("../database/db");
const { isEnabled } = require("./featureToggles");

function addCase(guildId, action, targetId, moderatorId, reason, metadata = {}) {
  return db.prepare(`
    INSERT INTO moderation_cases (guild_id, action, target_id, moderator_id, reason, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, action, targetId, moderatorId, reason || null, JSON.stringify(metadata || {}), Date.now()).lastInsertRowid;
}

function warnUser(guildId, userId, moderatorId, reason) {
  const info = db.prepare(`
    INSERT INTO warnings (guild_id, user_id, moderator_id, reason, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(guildId, userId, moderatorId, reason || "No reason provided", Date.now());
  addCase(guildId, "warn", userId, moderatorId, reason);
  return info.lastInsertRowid;
}

function getWarnings(guildId, userId) {
  return db.prepare("SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC").all(guildId, userId);
}

function clearWarnings(guildId, userId) {
  db.prepare("DELETE FROM warnings WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
  addCase(guildId, "clear-warnings", userId, null, "Warnings cleared");
}

function listCases(guildId, userId = null, limit = 20) {
  if (userId) {
    return db.prepare(`
      SELECT * FROM moderation_cases
      WHERE guild_id = ? AND target_id = ?
      ORDER BY id DESC
      LIMIT ?
    `).all(guildId, userId, limit);
  }
  return db.prepare(`
    SELECT * FROM moderation_cases
    WHERE guild_id = ?
    ORDER BY id DESC
    LIMIT ?
  `).all(guildId, limit);
}

async function applyTimeout(member, moderatorId, durationMs, reason) {
  await member.timeout(durationMs, reason || "No reason provided");
  db.prepare(`
    INSERT INTO temp_timeouts (guild_id, user_id, moderator_id, reason, expires_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET moderator_id = excluded.moderator_id, reason = excluded.reason, expires_at = excluded.expires_at
  `).run(member.guild.id, member.id, moderatorId, reason || "", Date.now() + durationMs);
  addCase(member.guild.id, "timeout", member.id, moderatorId, reason, { durationMs });
}

async function processTimeouts(client) {
  const rows = db.prepare("SELECT * FROM temp_timeouts WHERE expires_at <= ?").all(Date.now());
  for (const row of rows) {
    const guild = client.guilds.cache.get(row.guild_id);
    if (!guild) continue;
    const member = await guild.members.fetch(row.user_id).catch(() => null);
    if (member && member.communicationDisabledUntilTimestamp) {
      await member.timeout(null, "Timeout expired").catch(() => {});
      addCase(row.guild_id, "timeout-expired", row.user_id, null, "Automatic timeout expiry");
    }
    db.prepare("DELETE FROM temp_timeouts WHERE guild_id = ? AND user_id = ?").run(row.guild_id, row.user_id);
  }
}

async function handleJoin(member) {
  if (!isEnabled(member.guild.id, "autoRole")) return;
  const settings = getSettings(member.guild.id);
  const autoRoleId = settings.autoRoleId || settings.builtRoleIds?.["📝 Verified"];
  if (!autoRoleId) return;
  const role = member.guild.roles.cache.get(autoRoleId);
  if (role) await member.roles.add(role, "Auto role on join").catch(() => {});
}

async function handleVerification(interaction) {
  if (!isEnabled(interaction.guild.id, "verification")) {
    return interaction.reply({ content: "Verification is disabled.", ephemeral: true });
  }
  const panel = db.prepare("SELECT * FROM verification_panels WHERE guild_id = ?").get(interaction.guild.id);
  if (!panel) return interaction.reply({ content: "Verification panel not configured.", ephemeral: true });
  const role = interaction.guild.roles.cache.get(panel.role_id);
  if (!role) return interaction.reply({ content: "Verification role not found.", ephemeral: true });
  await interaction.member.roles.add(role, "Verification panel");
  addCase(interaction.guild.id, "verify", interaction.user.id, interaction.user.id, "Self verification");
  return interaction.reply({ content: `Verified. You received ${role.name}.`, ephemeral: true });
}

async function createVerificationPanel(channel, roleId) {
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
  const msg = await channel.send({
    embeds: [new EmbedBuilder().setColor("#C084FC").setTitle("Verification").setDescription("Click below to verify and unlock the server.")],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("verify:join").setLabel("Verify").setStyle(ButtonStyle.Success)
    )]
  });
  db.prepare(`
    INSERT INTO verification_panels (guild_id, channel_id, message_id, role_id, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id, message_id = excluded.message_id, role_id = excluded.role_id, created_at = excluded.created_at
  `).run(channel.guild.id, channel.id, msg.id, roleId, Date.now());
  return msg;
}

module.exports = {
  addCase, warnUser, getWarnings, clearWarnings, listCases, applyTimeout, processTimeouts, handleJoin, handleVerification, createVerificationPanel,
};
