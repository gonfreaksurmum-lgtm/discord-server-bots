const { SlashCommandBuilder } = require("discord.js");
const { setSettings } = require("../../database/db");
const { canManageBot } = require("../../utils/permissions");
const { successEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-permission-role")
    .setDescription("Set the role that grants advanced bot setup/custom role access.")
    .addRoleOption((o) => o.setName("role").setDescription("Permission role").setRequired(true)),

  async execute(interaction) {
    if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
    const role = interaction.options.getRole("role", true);
    setSettings(interaction.guild.id, { permissionRoleId: role.id });
    await interaction.reply({ embeds: [successEmbed(`Permission role set to ${role}.`)], ephemeral: true });
  },
};
