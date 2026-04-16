const { sendLog } = require("../services/logging");

module.exports = {
  name: "messageUpdate",
  async execute(oldMessage, newMessage) {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if ((oldMessage.content || "") === (newMessage.content || "")) return;
    await sendLog(oldMessage.guild, "modLogChannelId", "Message Edited",
      `Author: ${oldMessage.author}\nChannel: ${oldMessage.channel}\nBefore: ${(oldMessage.content || "*none*").slice(0, 500)}\nAfter: ${(newMessage.content || "*none*").slice(0, 500)}`);
  },
};
