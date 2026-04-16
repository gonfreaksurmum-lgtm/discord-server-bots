const { toggleEnabled } = require("../../services/featureToggles");
const featuresCommand = require("../../commands/foundation/features");

module.exports = {
  customId: "features:pick",
  async execute(interaction) {
    const feature = interaction.values?.[0];
    const phase = interaction.customId.split(":")[2];
    toggleEnabled(interaction.guild.id, feature);
    await interaction.update({
      embeds: [featuresCommand.buildEmbed(interaction.guild.id, phase === "all" ? null : phase)],
      components: featuresCommand.buildRows(interaction.guild.id, phase === "all" ? null : phase),
    });
  },
};
