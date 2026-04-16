const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getFeatureCounts } = require("../../services/featureToggles");
const { db } = require("../../database/db");
const { withOwnerExtras } = require("../../utils/ownerResponse");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("View live bot, guild, and feature health information."),
  async execute(interaction) {
    const counts = getFeatureCounts(interaction.guild.id);
    const rows = {
      tickets: db.prepare("SELECT COUNT(*) c FROM tickets WHERE guild_id = ? AND status = 'open'").get(interaction.guild.id)?.c || 0,
      reminders: db.prepare("SELECT COUNT(*) c FROM reminders WHERE guild_id = ? AND sent = 0").get(interaction.guild.id)?.c || 0,
      suggestions: db.prepare("SELECT COUNT(*) c FROM suggestions WHERE guild_id = ?").get(interaction.guild.id)?.c || 0,
      giveaways: db.prepare("SELECT COUNT(*) c FROM giveaways WHERE guild_id = ? AND ended = 0").get(interaction.guild.id)?.c || 0,
    };

    const embed = new EmbedBuilder()
      .setColor("#C084FC")
      .setTitle("Bot Status")
      .setDescription("Live status for the current guild and runtime.")
      .addFields(
        { name: "Latency", value: `${interaction.client.ws.ping}ms`, inline: true },
        { name: "Commands", value: `${interaction.client.commands.size}`, inline: true },
        { name: "Guild Members", value: `${interaction.guild.memberCount}`, inline: true },
        { name: "Features", value: `${counts.enabled}/${counts.total} enabled`, inline: true },
        { name: "Open Tickets", value: `${rows.tickets}`, inline: true },
        { name: "Pending Reminders", value: `${rows.reminders}`, inline: true },
        { name: "Suggestions", value: `${rows.suggestions}`, inline: true },
        { name: "Active Giveaways", value: `${rows.giveaways}`, inline: true },
      )
      .setFooter({ text: "Use /features to change feature states live." });

    await interaction.reply(withOwnerExtras(interaction, { embeds: [embed], ephemeral: true }, {
      extras: { MemoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) }
    }));
  },
};
