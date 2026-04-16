const { db, getSettings } = require("../database/db");

function xpFor(level) {
  return 100 + level * 50;
}

function getUser(guildId, userId) {
  return db.prepare("SELECT * FROM user_levels WHERE guild_id = ? AND user_id = ?").get(guildId, userId);
}

function ensureUser(guildId, userId) {
  const existing = getUser(guildId, userId);
  if (existing) return existing;
  db.prepare("INSERT INTO user_levels (guild_id, user_id, xp, level) VALUES (?, ?, 0, 0)").run(guildId, userId);
  return getUser(guildId, userId);
}

async function addXp(message, amount = 15) {
  if (!message.guild || message.author.bot) return null;
  let user = ensureUser(message.guild.id, message.author.id);

  const nextXp = user.xp + amount;
  let level = user.level;
  let xp = nextXp;
  let leveledUp = false;

  while (xp >= xpFor(level)) {
    xp -= xpFor(level);
    level += 1;
    leveledUp = true;
  }

  db.prepare("UPDATE user_levels SET xp = ?, level = ? WHERE guild_id = ? AND user_id = ?")
    .run(xp, level, message.guild.id, message.author.id);

  if (leveledUp) {
    const settings = getSettings(message.guild.id);
    const rewardRoleId = settings.levelRewardRoleIds?.[level];
    if (rewardRoleId) {
      const member = await message.guild.members.fetch(message.author.id).catch(() => null);
      if (member) {
        const role = message.guild.roles.cache.get(rewardRoleId);
        if (role) await member.roles.add(role, "Level reward").catch(() => {});
      }
    }
    return { level };
  }

  return null;
}

function getLeaderboard(guildId, limit = 10) {
  return db.prepare(`
    SELECT * FROM user_levels
    WHERE guild_id = ?
    ORDER BY level DESC, xp DESC
    LIMIT ?
  `).all(guildId, limit);
}

module.exports = { addXp, getLeaderboard, getUser, ensureUser };
