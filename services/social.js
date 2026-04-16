const { db } = require("../database/db");
const { isEnabled } = require("./featureToggles");

function ensureProfile(guildId, userId) {
  db.prepare(`
    INSERT INTO profiles (guild_id, user_id, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO NOTHING
  `).run(guildId, userId, Date.now());
  return getProfile(guildId, userId);
}
function getProfile(guildId, userId) {
  return db.prepare("SELECT * FROM profiles WHERE guild_id = ? AND user_id = ?").get(guildId, userId);
}
function updateProfile(guildId, userId, patch) {
  const existing = ensureProfile(guildId, userId);
  const next = { ...existing, ...patch };
  db.prepare(`
    INSERT OR REPLACE INTO profiles (guild_id, user_id, bio, favorite_color, pronouns, banner, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, userId, next.bio || "", next.favorite_color || null, next.pronouns || null, next.banner || null, Date.now());
  return getProfile(guildId, userId);
}

function addRep(guildId, giverId, receiverId, reason) {
  db.prepare(`
    INSERT INTO reputation (guild_id, giver_id, receiver_id, value, reason, created_at)
    VALUES (?, ?, ?, 1, ?, ?)
  `).run(guildId, giverId, receiverId, reason || null, Date.now());
}
function getRep(guildId, userId) {
  return db.prepare("SELECT COUNT(*) as count FROM reputation WHERE guild_id = ? AND receiver_id = ?").get(guildId, userId)?.count || 0;
}
function hasGivenRepToday(guildId, giverId, receiverId) {
  const since = Date.now() - 86_400_000;
  return !!db.prepare(`
    SELECT 1 FROM reputation WHERE guild_id = ? AND giver_id = ? AND receiver_id = ? AND created_at >= ?
  `).get(guildId, giverId, receiverId, since);
}

function setAfk(guildId, userId, reason) {
  db.prepare(`
    INSERT INTO afk_status (guild_id, user_id, reason, set_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET reason = excluded.reason, set_at = excluded.set_at
  `).run(guildId, userId, reason || "AFK", Date.now());
}
function clearAfk(guildId, userId) {
  db.prepare("DELETE FROM afk_status WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
}
function getAfk(guildId, userId) {
  return db.prepare("SELECT * FROM afk_status WHERE guild_id = ? AND user_id = ?").get(guildId, userId);
}

function marry(guildId, user1Id, user2Id) {
  const a = [user1Id, user2Id].sort();
  db.prepare(`
    INSERT INTO marriages (guild_id, user1_id, user2_id, married_at)
    VALUES (?, ?, ?, ?)
  `).run(guildId, a[0], a[1], Date.now());
}
function getMarriage(guildId, userId) {
  return db.prepare(`
    SELECT * FROM marriages WHERE guild_id = ? AND (user1_id = ? OR user2_id = ?)
  `).get(guildId, userId, userId);
}
function divorce(guildId, userId) {
  db.prepare("DELETE FROM marriages WHERE guild_id = ? AND (user1_id = ? OR user2_id = ?)").run(guildId, userId, userId);
}

module.exports = {
  ensureProfile, getProfile, updateProfile, addRep, getRep, hasGivenRepToday,
  setAfk, clearAfk, getAfk, marry, getMarriage, divorce,
};
