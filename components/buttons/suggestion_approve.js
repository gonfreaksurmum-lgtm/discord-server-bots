const { updateSuggestionStatus } = require("../../services/suggestions");

module.exports = {
  customId: "suggestion:approve",
  async execute(interaction) {
    await updateSuggestionStatus(interaction, "approved");
  },
};
