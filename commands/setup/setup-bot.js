const { SlashCommandBuilder } = require("discord.js");
const { setSettings, getSettings } = require("../../database/db");
const { successEmbed } = require("../../utils/embeds");
const { canManageBot } = require("../../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-bot")
    .setDescription("Initialize default bot settings from the built server map."),

  async execute(interaction) {
    if (!canManageBot(interaction.member)) {
      throw new Error("You do not have permission to use this command.");
    }

    const current = getSettings(interaction.guild.id);
    const built = current.builtChannels || {};
    const next = setSettings(interaction.guild.id, {
      suggestionsChannelId: built["💡 COMMUNITY"]?.children?.["suggestions"] || current.suggestionsChannelId || null,
      starboardChannelId: built["💡 COMMUNITY"]?.children?.["starboard"] || current.starboardChannelId || null,
      giveawayChannelId: built["💡 COMMUNITY"]?.children?.["giveaways"] || current.giveawayChannelId || null,
      announcementChannelId: built["📌 START HERE"]?.children?.["announcements"] || current.announcementChannelId || null,
      transcriptChannelId: built["🗃️ ARCHIVE"]?.children?.["transcripts"] || current.transcriptChannelId || null
    });

    await interaction.reply({ embeds: [successEmbed("Bot settings initialized.")], ephemeral: true });
  },
};
