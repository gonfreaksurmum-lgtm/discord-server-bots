const { createTicketFromModal } = require("../../services/tickets");

module.exports = {
  customId: "ticketreason:create",
  async execute(interaction) {
    const [, , type] = interaction.customId.split(":");
    await createTicketFromModal(interaction, type);
  },
};
