const { handleVerification } = require("../../services/moderationPlus");

module.exports = {
  customId: "verify:join",
  async execute(interaction) {
    await handleVerification(interaction);
  },
};
