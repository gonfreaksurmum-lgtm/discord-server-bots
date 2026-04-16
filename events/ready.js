const { log } = require("../utils/logger");
const { cacheGuildInvites } = require("../services/invites");
const { updateMemberCounter } = require("../services/memberCount");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    log(`Logged in as ${client.user.tag}`);
    for (const guild of client.guilds.cache.values()) {
      await cacheGuildInvites(guild).catch(() => {});
      await guild.members.fetch().catch(() => {});
      await updateMemberCounter(guild).catch(() => {});
    }
  },
};
