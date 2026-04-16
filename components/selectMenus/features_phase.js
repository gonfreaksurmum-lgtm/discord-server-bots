const featuresCommand = require("../../commands/foundation/features");

module.exports = {
  customId: "features:phase",
  async execute(interaction) {
    const phase = interaction.values?.[0] || "all";
    await interaction.update({
      embeds: [featuresCommand.buildEmbed(interaction.guild.id, phase === "all" ? null : phase)],
      components: featuresCommand.buildRows(interaction.guild.id, phase === "all" ? null : phase),
    });
  },
};
