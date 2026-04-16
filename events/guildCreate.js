const { cacheGuildInvites } = require("../services/invites");

module.exports = {
  name: "guildCreate",
  async execute(guild) {
    await cacheGuildInvites(guild).catch(() => {});
  },
};
