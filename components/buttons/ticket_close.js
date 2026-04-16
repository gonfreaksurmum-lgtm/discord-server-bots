const { updateTicketState } = require("../../services/tickets");

module.exports = {
  customId: "ticket:close",
  async execute(interaction) {
    await updateTicketState(interaction, "close");
  },
};
