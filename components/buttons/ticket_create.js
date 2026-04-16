const { showCreateReasonModal } = require("../../services/tickets");

module.exports = {
  customId: "ticket:create",
  async execute(interaction) {
    const [, , type] = interaction.customId.split(":");
    await showCreateReasonModal(interaction, type);
  },
};
