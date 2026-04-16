const { SlashCommandBuilder } = require("discord.js");
const {
  createCustomRole,
  editCustomRole,
  deleteCustomRole,
  getCustomRoleRecord,
} = require("../../services/customroles");
const { successEmbed, infoEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("customrole")
    .setDescription("Create, edit, delete, or inspect your custom role.")
    .addSubcommand((s) =>
      s.setName("create")
        .setDescription("Create your custom role")
        .addStringOption((o) => o.setName("name").setDescription("Role name").setRequired(true))
        .addStringOption((o) => o.setName("color").setDescription("Hex color like #ff66cc").setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName("edit")
        .setDescription("Edit your custom role")
        .addStringOption((o) => o.setName("name").setDescription("New role name").setRequired(false))
        .addStringOption((o) => o.setName("color").setDescription("New hex color").setRequired(false))
    )
    .addSubcommand((s) => s.setName("delete").setDescription("Delete your custom role"))
    .addSubcommand((s) => s.setName("info").setDescription("View your custom role info")),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "create") {
      const name = interaction.options.getString("name", true);
      const color = interaction.options.getString("color", true);
      const role = await createCustomRole(interaction.member, name, color);
      return interaction.reply({ embeds: [successEmbed(`Created custom role ${role}.`)], ephemeral: true });
    }

    if (sub === "edit") {
      const name = interaction.options.getString("name");
      const color = interaction.options.getString("color");
      if (!name && !color) throw new Error("Provide a new name and/or color.");
      const role = await editCustomRole(interaction.member, { name, color });
      return interaction.reply({ embeds: [successEmbed(`Updated custom role ${role}.`)], ephemeral: true });
    }

    if (sub === "delete") {
      await deleteCustomRole(interaction.member);
      return interaction.reply({ embeds: [successEmbed("Deleted your custom role.")], ephemeral: true });
    }

    if (sub === "info") {
      const record = getCustomRoleRecord(interaction.guild.id, interaction.user.id);
      if (!record) throw new Error("You do not own a custom role.");
      return interaction.reply({
        embeds: [infoEmbed("Custom Role", `Role ID: \`${record.role_id}\`\nName: **${record.name}**\nColor: \`${record.color}\``)],
        ephemeral: true
      });
    }
  },
};
