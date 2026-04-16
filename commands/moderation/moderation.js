const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { db } = require("../../database/db");
const { parseDuration } = require("../../utils/duration");
const { successEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moderation")
    .setDescription("Moderation commands")
    .addSubcommand((s) =>
      s.setName("tempban")
        .setDescription("Temporarily ban a user")
        .addUserOption((o) => o.setName("user").setDescription("Target").setRequired(true))
        .addStringOption((o) => o.setName("duration").setDescription("Example 7d").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(false))
    )
    .addSubcommand((s) =>
      s.setName("announce")
        .setDescription("Send an embed announcement")
        .addStringOption((o) => o.setName("title").setDescription("Title").setRequired(true))
        .addStringOption((o) => o.setName("text").setDescription("Content").setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName("nuke")
        .setDescription("Clone and delete the current channel")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "tempban") {
      const user = interaction.options.getUser("user", true);
      const duration = parseDuration(interaction.options.getString("duration", true));
      const reason = interaction.options.getString("reason") || "No reason provided";
      if (!duration) throw new Error("Invalid duration.");
      await interaction.guild.members.ban(user.id, { reason: `Tempban by ${interaction.user.tag}: ${reason}` });
      db.prepare(`
        INSERT INTO tempbans (guild_id, user_id, moderator_id, reason, expires_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET moderator_id = excluded.moderator_id, reason = excluded.reason, expires_at = excluded.expires_at
      `).run(interaction.guild.id, user.id, interaction.user.id, reason, Date.now() + duration);
      return interaction.reply({ embeds: [successEmbed(`Temporarily banned ${user.tag}.`)] });
    }

    if (sub === "announce") {
      const title = interaction.options.getString("title", true);
      const text = interaction.options.getString("text", true);
      return interaction.reply({
        embeds: [
          {
            color: 0xC084FC,
            title,
            description: text,
            timestamp: new Date().toISOString(),
            footer: { text: `Announcement by ${interaction.user.tag}` }
          }
        ]
      });
    }

    if (sub === "nuke") {
      const oldChannel = interaction.channel;
      const clone = await oldChannel.clone();
      await oldChannel.delete("Channel nuked");
      return clone.send(`💥 Channel nuked by ${interaction.user}.`);
    }
  },
};
