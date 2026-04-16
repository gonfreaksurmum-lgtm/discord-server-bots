const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { sendPanel, TYPES } = require("../../services/selfroles");
const { canManageBot } = require("../../utils/permissions");
const { successEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("selfrole-panel")
    .setDescription("Send a self-role button panel.")
    .addStringOption((o) =>
      o.setName("type")
        .setDescription("Panel type")
        .setRequired(true)
        .addChoices(
          { name: "colors", value: "colors" },
          { name: "pings", value: "pings" },
          { name: "games", value: "games" },
          { name: "regions", value: "regions" }
        )
    )
    .addChannelOption((o) =>
      o.setName("channel")
        .setDescription("Channel to send the panel to")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
    const type = interaction.options.getString("type", true);
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    await sendPanel(channel, type);
    await interaction.reply({ embeds: [successEmbed(`Sent ${type} self-role panel in ${channel}.`)], ephemeral: true });
  },
};
