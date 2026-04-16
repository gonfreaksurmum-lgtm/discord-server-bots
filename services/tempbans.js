const { db } = require("../database/db");

async function processTempbans(client) {
  const rows = db.prepare("SELECT * FROM tempbans WHERE expires_at <= ?").all(Date.now());
  for (const row of rows) {
    const guild = client.guilds.cache.get(row.guild_id);
    if (!guild) continue;
    await guild.members.unban(row.user_id, "Tempban expired").catch(() => {});
    db.prepare("DELETE FROM tempbans WHERE guild_id = ? AND user_id = ?").run(row.guild_id, row.user_id);
  }
}

module.exports = { processTempbans };
