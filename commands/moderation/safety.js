const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { warnUser, getWarnings, clearWarnings, listCases, applyTimeout, createVerificationPanel } = require("../../services/moderationPlus");
const { parseDuration } = require("../../utils/duration");
const { setSettings } = require("../../database/db");
const { successEmbed, infoEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("safety")
    .setDescription("Advanced moderation and safety tools.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) =>
      s.setName("warn")
        .setDescription("Warn a member")
        .addUserOption((o) => o.setName("user").setDescription("Target").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(false)))
    .addSubcommand((s) =>
      s.setName("warnings")
        .setDescription("View a member's warnings")
        .addUserOption((o) => o.setName("user").setDescription("Target").setRequired(true)))
    .addSubcommand((s) =>
      s.setName("clearwarnings")
        .setDescription("Clear a member's warnings")
        .addUserOption((o) => o.setName("user").setDescription("Target").setRequired(true)))
    .addSubcommand((s) =>
      s.setName("cases")
        .setDescription("List recent moderation cases")
        .addUserOption((o) => o.setName("user").setDescription("Optional target")))
    .addSubcommand((s) =>
      s.setName("timeout")
        .setDescription("Timeout a member")
        .addUserOption((o) => o.setName("user").setDescription("Target").setRequired(true))
        .addStringOption((o) => o.setName("duration").setDescription("Example 30m").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(false)))
    .addSubcommand((s) =>
      s.setName("lockdown")
        .setDescription("Lock or unlock a text channel")
        .addChannelOption((o) => o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addBooleanOption((o) => o.setName("enabled").setDescription("True = lock").setRequired(true)))
    .addSubcommand((s) =>
      s.setName("verification")
        .setDescription("Create a verification panel")
        .addChannelOption((o) => o.setName("channel").setDescription("Target channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addRoleOption((o) => o.setName("role").setDescription("Role to grant").setRequired(true)))
    .addSubcommand((s) =>
      s.setName("autorole")
        .setDescription("Set the auto role on join")
        .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "warn") {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason") || "No reason provided";
      const id = warnUser(interaction.guild.id, user.id, interaction.user.id, reason);
      return interaction.reply({ embeds: [successEmbed(`Warned ${user.tag}. Warning ID: **${id}**`)] });
    }

    if (sub === "warnings") {
      const user = interaction.options.getUser("user", true);
      const rows = getWarnings(interaction.guild.id, user.id);
      return interaction.reply({
        embeds: [infoEmbed(`${user.tag}'s Warnings`, rows.length ? rows.slice(0, 10).map((r) => `#${r.id} • <t:${Math.floor(r.created_at / 1000)}:R> • ${r.reason}`).join("\n") : "No warnings.")],
        ephemeral: true,
      });
    }

    if (sub === "clearwarnings") {
      const user = interaction.options.getUser("user", true);
      clearWarnings(interaction.guild.id, user.id);
      return interaction.reply({ embeds: [successEmbed(`Cleared warnings for ${user.tag}.`)] });
    }

    if (sub === "cases") {
      const user = interaction.options.getUser("user");
      const rows = listCases(interaction.guild.id, user?.id || null, 15);
      return interaction.reply({
        embeds: [infoEmbed("Moderation Cases", rows.length ? rows.map((r) => `#${r.id} • **${r.action}** • ${r.target_id ? `<@${r.target_id}>` : "—"} • <t:${Math.floor(r.created_at / 1000)}:R>`).join("\n") : "No cases found.")],
        ephemeral: true,
      });
    }

    if (sub === "timeout") {
      const user = interaction.options.getUser("user", true);
      const member = await interaction.guild.members.fetch(user.id);
      const duration = parseDuration(interaction.options.getString("duration", true));
      if (!duration) throw new Error("Invalid duration.");
      const reason = interaction.options.getString("reason") || "No reason provided";
      await applyTimeout(member, interaction.user.id, duration, reason);
      return interaction.reply({ embeds: [successEmbed(`Timed out ${user.tag} for ${interaction.options.getString("duration", true)}.`)] });
    }

    if (sub === "lockdown") {
      const channel = interaction.options.getChannel("channel") || interaction.channel;
      const enabled = interaction.options.getBoolean("enabled", true);
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: !enabled });
      return interaction.reply({ embeds: [successEmbed(`${enabled ? "Locked" : "Unlocked"} ${channel}.`)], ephemeral: true });
    }

    if (sub === "verification") {
      const channel = interaction.options.getChannel("channel", true);
      const role = interaction.options.getRole("role", true);
      await createVerificationPanel(channel, role.id);
      return interaction.reply({ embeds: [successEmbed(`Verification panel sent to ${channel}.`)], ephemeral: true });
    }

    if (sub === "autorole") {
      const role = interaction.options.getRole("role", true);
      setSettings(interaction.guild.id, { autoRoleId: role.id });
      return interaction.reply({ embeds: [successEmbed(`Auto role set to ${role}.`)], ephemeral: true });
    }
  },
};
