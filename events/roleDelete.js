const { sendLog } = require("../services/logging");
module.exports = {
  name: "roleDelete",
  async execute(role) {
    await sendLog(role.guild, "roleLogChannelId", "Role Deleted", `Deleted role **${role.name}**`);
  },
};
