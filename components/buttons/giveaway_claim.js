const { handleGiveawayClaimButton } = require("../../services/giveaways");

module.exports = {
  customId: "giveaway:claim",
  async execute(interaction) {
    const [, , messageId] = interaction.customId.split(":");
    await handleGiveawayClaimButton(interaction, messageId);
  },
};
