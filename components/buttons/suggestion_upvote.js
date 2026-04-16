module.exports = {
  customId: "suggestion:upvote",
  async execute(interaction) {
    await interaction.reply({ content: "Vote recorded conceptually. Expand this to store per-user votes if you want duplicate protection.", ephemeral: true });
  },
};
