const { db } = require("../database/db");

function grantAchievement(guildId, userId, code) {
  db.prepare(`
    INSERT OR IGNORE INTO achievements (guild_id, user_id, code, earned_at)
    VALUES (?, ?, ?, ?)
  `).run(guildId, userId, code, Date.now());
}

function getAchievements(guildId, userId) {
  return db.prepare("SELECT * FROM achievements WHERE guild_id = ? AND user_id = ? ORDER BY earned_at DESC").all(guildId, userId);
}

function updateVoiceJoin(memberId, guildId, joined) {
  db.prepare(`
    INSERT INTO voice_activity (guild_id, user_id, total_seconds, joined_at)
    VALUES (?, ?, 0, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET joined_at = excluded.joined_at
  `).run(guildId, memberId, joined);
}

function updateVoiceLeave(memberId, guildId, left) {
  const row = db.prepare("SELECT * FROM voice_activity WHERE guild_id = ? AND user_id = ?").get(guildId, memberId);
  if (!row || !row.joined_at) return;
  const seconds = Math.max(0, Math.floor((left - row.joined_at) / 1000));
  db.prepare("UPDATE voice_activity SET total_seconds = total_seconds + ?, joined_at = NULL WHERE guild_id = ? AND user_id = ?")
    .run(seconds, guildId, memberId);
}

function getVoiceStats(guildId, userId) {
  return db.prepare("SELECT * FROM voice_activity WHERE guild_id = ? AND user_id = ?").get(guildId, userId) || { total_seconds: 0 };
}

function getVoiceLeaderboard(guildId, limit = 10) {
  return db.prepare(`
    SELECT * FROM voice_activity
    WHERE guild_id = ?
    ORDER BY total_seconds DESC
    LIMIT ?
  `).all(guildId, limit);
}

function getAnalytics(guild) {
  const levels = db.prepare("SELECT COUNT(*) c FROM user_levels WHERE guild_id = ?").get(guild.id)?.c || 0;
  const economyUsers = db.prepare("SELECT COUNT(*) c FROM economy_balances WHERE guild_id = ?").get(guild.id)?.c || 0;
  const tickets = db.prepare("SELECT COUNT(*) c FROM tickets WHERE guild_id = ?").get(guild.id)?.c || 0;
  const achievements = db.prepare("SELECT COUNT(*) c FROM achievements WHERE guild_id = ?").get(guild.id)?.c || 0;
  const reminders = db.prepare("SELECT COUNT(*) c FROM reminders WHERE guild_id = ? AND sent = 0").get(guild.id)?.c || 0;
  const applications = db.prepare("SELECT COUNT(*) c FROM applications WHERE guild_id = ?").get(guild.id)?.c || 0;
  return {
    members: guild.memberCount,
    channels: guild.channels.cache.size,
    roles: guild.roles.cache.size,
    trackedLevels: levels,
    economyUsers,
    tickets,
    achievements,
    pendingReminders: reminders,
    applications,
  };
}

module.exports = { grantAchievement, getAchievements, updateVoiceJoin, updateVoiceLeave, getVoiceStats, getVoiceLeaderboard, getAnalytics };
