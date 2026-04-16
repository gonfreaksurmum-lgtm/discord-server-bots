const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require("discord.js");
const { canManageBot } = require("../../utils/permissions");
const { getTicketOverview, getTicketSystem, saveTicketSystem } = require("../../services/tickets");
const { successEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket-config")
    .setDescription("Configure the ticket system.")
    .addSubcommand((s) =>
      s.setName("overview").setDescription("View the current ticket setup"))
    .addSubcommand((s) =>
      s.setName("panel")
        .setDescription("Edit panel text")
        .addStringOption((o) => o.setName("title").setDescription("Panel title").setRequired(true))
        .addStringOption((o) => o.setName("description").setDescription("Panel description").setRequired(true)))
    .addSubcommand((s) =>
      s.setName("type-add")
        .setDescription("Add or update a ticket type")
        .addStringOption((o) => o.setName("key").setDescription("type key, example divisionfour").setRequired(true))
        .addStringOption((o) => o.setName("label").setDescription("Button label").setRequired(true))
        .addStringOption((o) => o.setName("emoji").setDescription("Emoji").setRequired(true))
        .addRoleOption((o) => o.setName("support_role").setDescription("Main support role").setRequired(true))
        .addChannelOption((o) => o.setName("category").setDescription("Category for created tickets").addChannelTypes(ChannelType.GuildCategory).setRequired(false)))
    .addSubcommand((s) =>
      s.setName("claimer-add")
        .setDescription("Add a role that can claim tickets")
        .addRoleOption((o) => o.setName("role").setDescription("Claimer role").setRequired(true)))
    .addSubcommand((s) =>
      s.setName("claimer-remove")
        .setDescription("Remove a role that can claim tickets")
        .addRoleOption((o) => o.setName("role").setDescription("Claimer role").setRequired(true)))
    .addSubcommand((s) =>
      s.setName("type-role")
        .setDescription("Add an extra support role to a ticket type")
        .addStringOption((o) => o.setName("key").setDescription("Type key").setRequired(true))
        .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true)))
    .addSubcommand((s) =>
      s.setName("toggle-user-close")
        .setDescription("Allow ticket creators to close their own tickets")
        .addBooleanOption((o) => o.setName("enabled").setDescription("Enabled").setRequired(true))),

  async execute(interaction) {
    if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
    const sub = interaction.options.getSubcommand();

    if (sub === "overview") {
      const overview = getTicketOverview(interaction.guild.id);
      const embed = new EmbedBuilder()
        .setColor("#facc15")
        .setTitle("Ticket Configuration")
        .setDescription(`Types: **${overview.typeCount}**\nUser close: **${overview.system.allowUserClose ? "Enabled" : "Disabled"}**`)
        .addFields(
          { name: "Panel", value: `${overview.system.panel.title}\n${overview.system.panel.description.slice(0, 500)}` },
          { name: "Claimers", value: overview.system.claimerRoleIds.length ? overview.system.claimerRoleIds.map((id) => `<@&${id}>`).join(", ") : "None configured" },
          { name: "Types", value: overview.types.map(([key, value]) => `\`${key}\` → ${value.label} (${(value.supportRoleIds || []).map((id) => `<@&${id}>`).join(", ") || "no roles"})`).join("\n").slice(0, 1024) || "None" }
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const current = getTicketSystem(interaction.guild.id);

    if (sub === "panel") {
      const title = interaction.options.getString("title", true);
      const description = interaction.options.getString("description", true);
      saveTicketSystem(interaction.guild.id, {
        ...current,
        panel: { ...(current.panel || {}), title, description }
      });
      return interaction.reply({ embeds: [successEmbed("Ticket panel updated.")], ephemeral: true });
    }

    if (sub === "type-add") {
      const key = interaction.options.getString("key", true).toLowerCase().replace(/[^a-z0-9_-]/g, "");
      const label = interaction.options.getString("label", true);
      const emoji = interaction.options.getString("emoji", true);
      const supportRole = interaction.options.getRole("support_role", true);
      const category = interaction.options.getChannel("category");
      saveTicketSystem(interaction.guild.id, {
        ...current,
        typeConfigs: {
          ...(current.typeConfigs || {}),
          [key]: {
            key,
            label,
            emoji,
            supportRoleIds: [supportRole.id],
            categoryId: category?.id || null,
            naming: key
          }
        }
      });
      return interaction.reply({ embeds: [successEmbed(`Saved ticket type \`${key}\`.`)], ephemeral: true });
    }

    if (sub === "claimer-add") {
      const role = interaction.options.getRole("role", true);
      const next = Array.from(new Set([...(current.claimerRoleIds || []), role.id]));
      saveTicketSystem(interaction.guild.id, { ...current, claimerRoleIds: next });
      return interaction.reply({ embeds: [successEmbed(`${role} can now claim tickets.`)], ephemeral: true });
    }

    if (sub === "claimer-remove") {
      const role = interaction.options.getRole("role", true);
      const next = (current.claimerRoleIds || []).filter((id) => id !== role.id);
      saveTicketSystem(interaction.guild.id, { ...current, claimerRoleIds: next });
      return interaction.reply({ embeds: [successEmbed(`${role} can no longer claim tickets.`)], ephemeral: true });
    }

    if (sub === "type-role") {
      const key = interaction.options.getString("key", true);
      const role = interaction.options.getRole("role", true);
      if (!current.typeConfigs?.[key]) throw new Error("Unknown ticket type.");
      const roles = Array.from(new Set([...(current.typeConfigs[key].supportRoleIds || []), role.id]));
      saveTicketSystem(interaction.guild.id, {
        ...current,
        typeConfigs: {
          ...(current.typeConfigs || {}),
          [key]: {
            ...current.typeConfigs[key],
            supportRoleIds: roles
          }
        }
      });
      return interaction.reply({ embeds: [successEmbed(`${role} added to \`${key}\` tickets.`)], ephemeral: true });
    }

    if (sub === "toggle-user-close") {
      const enabled = interaction.options.getBoolean("enabled", true);
      saveTicketSystem(interaction.guild.id, { ...current, allowUserClose: enabled });
      return interaction.reply({ embeds: [successEmbed(`User close is now ${enabled ? "enabled" : "disabled"}.`)], ephemeral: true });
    }
  }
};
