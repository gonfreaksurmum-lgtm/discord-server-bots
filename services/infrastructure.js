const { db, getSettings } = require("../database/db");
const { EmbedBuilder } = require("discord.js");

function exportGuildBackup(guildId) {
  return {
    exportedAt: Date.now(),
    settings: getSettings(guildId),
    featureToggles: db.prepare("SELECT feature, enabled FROM feature_toggles WHERE guild_id = ?").all(guildId),
    channelConfigs: db.prepare("SELECT channel_id, feature, config_json FROM channel_configs WHERE guild_id = ?").all(guildId),
    shopItems: db.prepare("SELECT * FROM shop_items WHERE guild_id = ?").all(guildId),
    inviteRewards: db.prepare("SELECT * FROM invite_rewards WHERE guild_id = ?").all(guildId),
  };
}
function importGuildBackup(guildId, payload, setSettings) {
  if (payload.settings) setSettings(guildId, payload.settings);
  for (const row of payload.featureToggles || []) {
    db.prepare(`
      INSERT INTO feature_toggles (guild_id, feature, enabled, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id, feature) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at
    `).run(guildId, row.feature, row.enabled, Date.now());
  }
}
function createApplication(guildId, userId, type, answers) {
  return db.prepare(`
    INSERT INTO applications (guild_id, user_id, type, answers_json, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).run(guildId, userId, type, JSON.stringify(answers || {}), Date.now()).lastInsertRowid;
}
function listApplications(guildId, status = null) {
  if (status) return db.prepare("SELECT * FROM applications WHERE guild_id = ? AND status = ? ORDER BY id DESC").all(guildId, status);
  return db.prepare("SELECT * FROM applications WHERE guild_id = ? ORDER BY id DESC").all(guildId);
}
function setInviteReward(guildId, inviteCount, roleId) {
  db.prepare(`
    INSERT OR REPLACE INTO invite_rewards (guild_id, invite_count, role_id)
    VALUES (?, ?, ?)
  `).run(guildId, inviteCount, roleId);
}
function listInviteRewards(guildId) {
  return db.prepare("SELECT * FROM invite_rewards WHERE guild_id = ? ORDER BY invite_count ASC").all(guildId);
}
module.exports = { exportGuildBackup, importGuildBackup, createApplication, listApplications, setInviteReward, listInviteRewards };
