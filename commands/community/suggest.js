const { SlashCommandBuilder } = require("discord.js");
const { createSuggestion } = require("../../services/suggestions");
const { successEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Submit a server suggestion.")
    .addStringOption((o) => o.setName("idea").setDescription("Your suggestion").setRequired(true)),

  async execute(interaction) {
    const idea = interaction.options.getString("idea", true);
    await createSuggestion(interaction, idea);
    await interaction.reply({ embeds: [successEmbed("Suggestion submitted.")], ephemeral: true });
  },
};
