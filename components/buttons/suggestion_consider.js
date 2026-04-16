const { updateSuggestionStatus } = require("../../services/suggestions");

module.exports = {
  customId: "suggestion:consider",
  async execute(interaction) {
    await updateSuggestionStatus(interaction, "considering");
  },
};
