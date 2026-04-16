const { handleGiveawayButton } = require("../../services/giveaways");

module.exports = {
  customId: "giveaway:entries",
  async execute(interaction) {
    await handleGiveawayButton(interaction, "entries");
  },
};
