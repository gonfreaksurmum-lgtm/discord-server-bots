const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

function bars(a, b) {
  const total = a + b || 1;
  const left = Math.round((a / total) * 10);
  const right = 10 - left;
  return `**Option 1** ${"█".repeat(left)}${"░".repeat(right)} ${a}\n**Option 2** ${"█".repeat(Math.round((b / total) * 10))}${"░".repeat(10 - Math.round((b / total) * 10))} ${b}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a 2-option interactive poll.")
    .addStringOption((o) => o.setName("question").setDescription("Question").setRequired(true))
    .addStringOption((o) => o.setName("option1").setDescription("Option 1").setRequired(true))
    .addStringOption((o) => o.setName("option2").setDescription("Option 2").setRequired(true)),

  async execute(interaction) {
    const question = interaction.options.getString("question", true);
    const option1 = interaction.options.getString("option1", true);
    const option2 = interaction.options.getString("option2", true);

    const embed = new EmbedBuilder()
      .setColor("#C084FC")
      .setTitle("Poll")
      .setDescription(`**${question}**\n\n1️⃣ ${option1}\n2️⃣ ${option2}\n\n${bars(0, 0)}`)
      .setFooter({ text: `poll:${option1}|${option2}|0|0` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("poll:vote:1").setLabel(option1).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("poll:vote:2").setLabel(option2).setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
