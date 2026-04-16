const menuCommand = require("../../commands/foundation/menu");

module.exports = {
  customId: "menu:category",
  async execute(interaction) {
    const grouped = menuCommand.groupCommandsByFolder();
    const value = interaction.values?.[0];
    const embed = value === "__overview"
      ? menuCommand.buildOverviewEmbed(grouped)
      : menuCommand.buildCategoryEmbed(grouped, value);

    await interaction.update({
      embeds: [embed],
      components: [menuCommand.buildSelect(grouped)],
    });
  },
};
