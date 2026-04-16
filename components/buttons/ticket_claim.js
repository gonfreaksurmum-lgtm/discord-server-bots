const { updateTicketState } = require("../../services/tickets");

module.exports = {
  customId: "ticket:claim",
  async execute(interaction) {
    await updateTicketState(interaction, "claim");
  },
};
