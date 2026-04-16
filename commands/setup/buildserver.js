const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { buildServer } = require("../../services/serverBuilder");
const { infoEmbed, successEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buildserver")
    .setDescription("Build the full aesthetic server structure from zero.")
    .addStringOption((o) =>
      o.setName("mode")
        .setDescription("fresh = build everything missing, safe = non-destructive")
        .setRequired(true)
        .addChoices(
          { name: "safe", value: "safe" },
          { name: "fresh", value: "fresh" }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({
      embeds: [infoEmbed("Building Server", "Creating roles, categories, channels, and saving IDs...")],
      ephemeral: true,
    });

    const mode = interaction.options.getString("mode", true);
    const settings = await buildServer(interaction.guild, mode);

    await interaction.editReply({
      embeds: [
        successEmbed(
          `Server build complete.\nRoles created/tracked: **${Object.keys(settings.builtRoleIds || {}).length}**\nCategories tracked: **${Object.keys(settings.builtChannels || {}).length}**`
        ),
      ],
    });
  },
};
