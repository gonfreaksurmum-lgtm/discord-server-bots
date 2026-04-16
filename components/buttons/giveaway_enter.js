const { handleGiveawayButton } = require("../../services/giveaways");

module.exports = {
  customId: "giveaway:enter",
  async execute(interaction) {
    await handleGiveawayButton(interaction, "enter");
  },
};
