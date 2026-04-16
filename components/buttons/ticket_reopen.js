const { updateTicketState } = require("../../services/tickets");

module.exports = {
  customId: "ticket:reopen",
  async execute(interaction) {
    await updateTicketState(interaction, "reopen");
  },
};
