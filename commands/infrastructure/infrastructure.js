const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { exportGuildBackup, createApplication, listApplications, setInviteReward, listInviteRewards } = require("../../services/infrastructure");
const { successEmbed, infoEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("infrastructure")
    .setDescription("Backups, applications, invite rewards.")
    .addSubcommand((s) => s.setName("backup").setDescription("Export guild backup"))
    .addSubcommand((s) => s.setName("apply").setDescription("Submit an application")
      .addStringOption((o) => o.setName("type").setDescription("Application type").setRequired(true))
      .addStringOption((o) => o.setName("why").setDescription("Why should you be accepted?").setRequired(true)))
    .addSubcommand((s) => s.setName("applications").setDescription("List applications"))
    .addSubcommand((s) => s.setName("invite-reward").setDescription("Set an invite reward")
      .addIntegerOption((o) => o.setName("count").setDescription("Invite count").setRequired(true))
      .addRoleOption((o) => o.setName("role").setDescription("Reward role").setRequired(true))
      )
    .addSubcommand((s) => s.setName("invite-rewards").setDescription("List invite rewards")),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "backup") {
      const backup = exportGuildBackup(interaction.guild.id);
      const buf = Buffer.from(JSON.stringify(backup, null, 2), "utf8");
      return interaction.reply({ content: "Guild backup exported.", files: [{ attachment: buf, name: `backup-${interaction.guild.id}.json` }], ephemeral: true });
    }
    if (sub === "apply") {
      const id = createApplication(interaction.guild.id, interaction.user.id, interaction.options.getString("type", true), { why: interaction.options.getString("why", true) });
      return interaction.reply({ embeds: [successEmbed(`Application submitted. ID: ${id}`)], ephemeral: true });
    }
    if (sub === "applications") {
      const rows = listApplications(interaction.guild.id);
      return interaction.reply({ embeds: [infoEmbed("Applications", rows.length ? rows.slice(0,20).map((r) => `#${r.id} • ${r.type} • <@${r.user_id}> • ${r.status}`).join("\n") : "No applications.")] });
    }
    if (sub === "invite-reward") {
      setInviteReward(interaction.guild.id, interaction.options.getInteger("count", true), interaction.options.getRole("role", true).id);
      return interaction.reply({ embeds: [successEmbed("Invite reward saved.")], ephemeral: true });
    }
    if (sub === "invite-rewards") {
      const rows = listInviteRewards(interaction.guild.id);
      return interaction.reply({ embeds: [infoEmbed("Invite Rewards", rows.length ? rows.map((r) => `${r.invite_count} invites → <@&${r.role_id}>`).join("\n") : "No invite rewards configured.")] });
    }
  },
};
