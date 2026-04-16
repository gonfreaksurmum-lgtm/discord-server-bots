const { updateTicketState } = require("../../services/tickets");

module.exports = {
  customId: "ticket:delete",
  async execute(interaction) {
    await updateTicketState(interaction, "delete");
  },
};
