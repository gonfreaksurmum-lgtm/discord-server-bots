const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { sendTicketPanel, saveTicketSystem } = require("../../services/tickets");
const { canManageBot } = require("../../utils/permissions");
const { successEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("Send the main ticket panel.")
    .addChannelOption((o) =>
      o.setName("channel")
        .setDescription("Where to send the panel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption((o) => o.setName("title").setDescription("Optional panel title").setRequired(false))
    .addStringOption((o) => o.setName("description").setDescription("Optional panel description").setRequired(false)),
  async execute(interaction) {
    if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");

    if (title || description) {
      const current = require("../../services/tickets").getTicketSystem(interaction.guild.id);
      saveTicketSystem(interaction.guild.id, {
        ...current,
        panel: {
          ...(current.panel || {}),
          ...(title ? { title } : {}),
          ...(description ? { description } : {})
        }
      });
    }

    await sendTicketPanel(channel);
    await interaction.reply({ embeds: [successEmbed(`Ticket panel sent to ${channel}.`)], ephemeral: true });
  },
};
