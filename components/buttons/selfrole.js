const { handleToggle } = require("../../services/selfroles");

module.exports = {
  customId: "selfrole",
  async execute(interaction) {
    const [, , roleId] = interaction.customId.split(":");
    await handleToggle(interaction, roleId);
  },
};
