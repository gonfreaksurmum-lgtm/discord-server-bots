const { EmbedBuilder } = require("discord.js");

module.exports = {
  customId: "poll:vote",
  async execute(interaction) {
    const choice = interaction.customId.split(":")[2];
    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    const footer = embed.data.footer?.text || "";
    const match = footer.match(/^poll:(.+)\|(.+)\|(\d+)\|(\d+)$/);
    if (!match) return interaction.reply({ content: "Poll metadata missing.", ephemeral: true });

    const [, option1, option2, aText, bText] = match;
    let a = Number(aText);
    let b = Number(bText);
    if (choice === "1") a += 1;
    if (choice === "2") b += 1;

    const total = a + b || 1;
    const left = Math.round((a / total) * 10);
    const right = 10 - left;
    const bar1 = `${"█".repeat(left)}${"░".repeat(right)} ${a}`;
    const left2 = Math.round((b / total) * 10);
    const bar2 = `${"█".repeat(left2)}${"░".repeat(10 - left2)} ${b}`;

    embed.setDescription(`**${embed.data.description.split("\n")[0].replace(/\*\*/g, "")}**\n\n1️⃣ ${option1}\n2️⃣ ${option2}\n\n**Option 1** ${bar1}\n**Option 2** ${bar2}`);
    embed.setFooter({ text: `poll:${option1}|${option2}|${a}|${b}` });

    await interaction.update({ embeds: [embed] });
  },
};
