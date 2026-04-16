const { sendLog } = require("../services/logging");
module.exports = {
  name: "channelDelete",
  async execute(channel) {
    if (!channel.guild) return;
    await sendLog(channel.guild, "modLogChannelId", "Channel Deleted", `Deleted #${channel.name}`);
  },
};
