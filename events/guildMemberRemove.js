const { sendLog } = require("../services/logging");
const { updateMemberCounter } = require("../services/memberCount");
const welcome = require("../services/welcome");

module.exports = {
  name: "guildMemberRemove",
  async execute(member) {
    await sendLog(member.guild, "joinLogChannelId", "Member Left", `${member.user.tag} left the server.`);
    await updateMemberCounter(member.guild);
    await welcome.sendLeave(member).catch(() => {});
  },
};
