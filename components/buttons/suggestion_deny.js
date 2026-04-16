const { updateSuggestionStatus } = require("../../services/suggestions");

module.exports = {
  customId: "suggestion:deny",
  async execute(interaction) {
    await updateSuggestionStatus(interaction, "denied");
  },
};
