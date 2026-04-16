const { db } = require("../database/db");

async function cacheGuildInvites(guild) {
  const invites = await guild.invites.fetch().catch(() => null);
  if (!invites) return;
  const insert = db.prepare(`
    INSERT INTO invite_cache (guild_id, code, uses, inviter_id)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, code) DO UPDATE SET uses = excluded.uses, inviter_id = excluded.inviter_id
  `);
  for (const invite of invites.values()) {
    insert.run(guild.id, invite.code, invite.uses ?? 0, invite.inviter?.id ?? null);
  }
}

async function resolveUsedInvite(guild) {
  const newInvites = await guild.invites.fetch().catch(() => null);
  if (!newInvites) return null;
  const oldRows = db.prepare("SELECT * FROM invite_cache WHERE guild_id = ?").all(guild.id);

  let used = null;
  for (const invite of newInvites.values()) {
    const old = oldRows.find((r) => r.code === invite.code);
    const oldUses = old?.uses ?? 0;
    if ((invite.uses ?? 0) > oldUses) {
      used = invite;
      break;
    }
  }

  await cacheGuildInvites(guild);
  return used;
}

module.exports = { cacheGuildInvites, resolveUsedInvite };
