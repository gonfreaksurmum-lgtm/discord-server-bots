const { isOwner } = require("../../utils/permissions");
const { FEATURES, getFeatureCounts } = require("../../services/featureToggles");
const changelog = require("../../data/changelog");

module.exports = {
  customId: "ownerpanel",
  async execute(interaction) {
    if (!isOwner(interaction.user.id)) {
      return interaction.reply({ content: "Owner only.", ephemeral: true });
    }

    const action = interaction.customId.split(":")[1];
    if (action === "menu") {
      return interaction.reply({ content: "Open `/menu` to browse every command category.", ephemeral: true });
    }
    if (action === "features") {
      const counts = getFeatureCounts(interaction.guild.id);
      return interaction.reply({
        content: `Feature dashboard: **${counts.enabled}/${counts.total}** enabled across **${counts.byPhase.length}** phases. Use \`/features\`.`,
        ephemeral: true,
      });
    }
    if (action === "updates") {
      return interaction.reply({
        content: `Latest release: **${changelog[0]?.version || "unknown"}** — use \`/updates\` for the full changelog.`,
        ephemeral: true,
      });
    }
    if (action === "status") {
      const counts = getFeatureCounts(interaction.guild.id);
      return interaction.reply({
        content: `Guild: **${interaction.guild.name}**\nMembers: **${interaction.guild.memberCount}**\nCommands: **${interaction.client.commands.size}**\nFeatures: **${counts.enabled}/${counts.total} enabled**\nPing: **${interaction.client.ws.ping}ms**`,
        ephemeral: true,
      });
    }
  },
};
