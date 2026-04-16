const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const changelog = require("../../data/changelog");
const { withOwnerExtras } = require("../../utils/ownerResponse");
const config = require("../../config");

function buildEmbed(entry, index, total) {
  const embed = new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(`${entry.title}`)
    .setDescription(`**v${entry.version}** — ${entry.date}${entry.phase ? ` · Phase ${entry.phase}` : ""}`)
    .setFooter({ text: `Release ${index + 1} / ${total}` })
    .setTimestamp();

  if (entry.highlights?.length) {
    embed.addFields({
      name: "✨ Highlights",
      value: entry.highlights.map((h) => `• ${h}`).join("\n").slice(0, 1024),
    });
  }

  if (entry.notes?.length) {
    embed.addFields({
      name: "📌 Notes",
      value: entry.notes.map((n) => `• ${n}`).join("\n").slice(0, 1024),
    });
  }

  return embed;
}

function buildButtons(index, total) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`updates:prev:${index}`)
      .setLabel("◀ Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId(`updates:next:${index}`)
      .setLabel("Next ▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index >= total - 1),
    new ButtonBuilder()
      .setCustomId(`updates:latest:${index}`)
      .setLabel("⏮ Latest")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index === 0)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("updates")
    .setDescription("See the bot's changelog — every feature ever added."),

  async execute(interaction) {
    const total = changelog.length;
    const index = 0;
    const payload = {
      embeds: [buildEmbed(changelog[index], index, total)],
      components: [buildButtons(index, total)],
    };
    await interaction.reply(
      withOwnerExtras(interaction, payload, { extras: { Releases: total } })
    );
  },

  // Exposed for the button handler:
  buildEmbed,
  buildButtons,
};
