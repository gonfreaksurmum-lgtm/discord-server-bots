const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require("discord.js");
const { getAchievements, getVoiceStats, getAnalytics, getVoiceLeaderboard } = require("../../services/premium");
const { db } = require("../../database/db");
const { successEmbed, infoEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("premium")
    .setDescription("Advanced analytics, achievements, and voice systems.")
    .addSubcommand((s) => s.setName("achievements").setDescription("View achievements").addUserOption((o) => o.setName("user").setDescription("Target")))
    .addSubcommand((s) => s.setName("voicestats").setDescription("View voice stats").addUserOption((o) => o.setName("user").setDescription("Target")))
    .addSubcommand((s) => s.setName("voiceleaderboard").setDescription("Top voice users"))
    .addSubcommand((s) => s.setName("analytics").setDescription("View guild analytics"))
    .addSubcommand((s) => s.setName("jtc-setup").setDescription("Setup join-to-create")
      .addChannelOption((o) => o.setName("lobby").setDescription("Lobby voice channel").addChannelTypes(ChannelType.GuildVoice).setRequired(true))
      .addChannelOption((o) => o.setName("category").setDescription("Optional category"))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "achievements") {
      const user = interaction.options.getUser("user") || interaction.user;
      const rows = getAchievements(interaction.guild.id, user.id);
      return interaction.reply({ embeds: [infoEmbed(`${user.username}'s Achievements`, rows.length ? rows.map((r) => `• \`${r.code}\``).join("\n") : "No achievements yet.")] });
    }

    if (sub === "voicestats") {
      const user = interaction.options.getUser("user") || interaction.user;
      const row = getVoiceStats(interaction.guild.id, user.id);
      const hours = (row.total_seconds / 3600).toFixed(2);
      return interaction.reply({ embeds: [infoEmbed(`${user.username}'s Voice Stats`, `Total tracked hours: **${hours}**`)] });
    }

    if (sub === "voiceleaderboard") {
      const rows = getVoiceLeaderboard(interaction.guild.id, 10);
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor("#C084FC").setTitle("Voice Leaderboard").setDescription(rows.length ? rows.map((r, i) => `${i + 1}. <@${r.user_id}> • **${(r.total_seconds / 3600).toFixed(2)}h**`).join("\n") : "No voice activity yet.")]
      });
    }

    if (sub === "analytics") {
      const a = getAnalytics(interaction.guild);
      return interaction.reply({ embeds: [infoEmbed("Guild Analytics", Object.entries(a).map(([k,v]) => `**${k}**: ${v}`).join("\n"))] });
    }

    if (sub === "jtc-setup") {
      const lobby = interaction.options.getChannel("lobby", true);
      const category = interaction.options.getChannel("category");
      db.prepare(`
        INSERT INTO jtc_configs (guild_id, lobby_channel_id, category_id)
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET lobby_channel_id = excluded.lobby_channel_id, category_id = excluded.category_id
      `).run(interaction.guild.id, lobby.id, category?.id || null);
      return interaction.reply({ embeds: [successEmbed("Join-to-create configured.")], ephemeral: true });
    }
  },
};
