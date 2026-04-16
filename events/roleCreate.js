const { sendLog } = require("../services/logging");
module.exports = {
  name: "roleCreate",
  async execute(role) {
    await sendLog(role.guild, "roleLogChannelId", "Role Created", `Created role **${role.name}**`);
  },
};
