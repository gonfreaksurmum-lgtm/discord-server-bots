const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { setSettings } = require("../../database/db");
const { canManageBot } = require("../../utils/permissions");
const { successEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-log-channel")
    .setDescription("Set a log channel.")
    .addStringOption((o) =>
      o.setName("type")
        .setDescription("Which log type")
        .setRequired(true)
        .addChoices(
          { name: "mod", value: "modLogChannelId" },
          { name: "role", value: "roleLogChannelId" },
          { name: "join", value: "joinLogChannelId" }
        )
    )
    .addChannelOption((o) =>
      o.setName("channel")
        .setDescription("Target channel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
    const key = interaction.options.getString("type", true);
    const channel = interaction.options.getChannel("channel", true);
    setSettings(interaction.guild.id, { [key]: channel.id });
    await interaction.reply({ embeds: [successEmbed(`Saved ${key} as ${channel}.`)], ephemeral: true });
  },
};
