const { SlashCommandBuilder } = require("discord.js");
const { updateMemberCounter } = require("../../services/memberCount");
const { successEmbed } = require("../../utils/embeds");
const { canManageBot } = require("../../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("membercount")
    .setDescription("Update member counter voice channels.")
    .addSubcommand((s) => s.setName("setup").setDescription("Refresh the counter channels immediately")),

  async execute(interaction) {
    if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
    await updateMemberCounter(interaction.guild);
    await interaction.reply({ embeds: [successEmbed("Member counter channels refreshed.")], ephemeral: true });
  },
};
