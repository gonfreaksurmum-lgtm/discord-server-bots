const { sendLog } = require("../services/logging");

module.exports = {
  name: "guildMemberUpdate",
  async execute(oldMember, newMember) {
    const oldRoles = oldMember.roles.cache.map((r) => r.id);
    const newRoles = newMember.roles.cache.map((r) => r.id);

    const added = newMember.roles.cache.filter((r) => !oldRoles.includes(r.id));
    const removed = oldMember.roles.cache.filter((r) => !newRoles.includes(r.id));

    if (added.size || removed.size) {
      await sendLog(
        newMember.guild,
        "roleLogChannelId",
        "Role Update",
        `${newMember.user}\nAdded: ${added.map((r) => r.name).join(", ") || "None"}\nRemoved: ${removed.map((r) => r.name).join(", ") || "None"}`
      );
    }
  },
};
