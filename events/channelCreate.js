const { sendLog } = require("../services/logging");
module.exports = {
  name: "channelCreate",
  async execute(channel) {
    if (!channel.guild) return;
    await sendLog(channel.guild, "modLogChannelId", "Channel Created", `Created ${channel} (${channel.type})`);
  },
};
