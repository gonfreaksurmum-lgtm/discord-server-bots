const changelog = require("../data/changelog");
const { buildEmbed, buildButtons } = require("../commands/foundation/updates");

async function handleUpdatesNav(interaction, action) {
  const parts = interaction.customId.split(":");
  const current = parseInt(parts[2], 10) || 0;
  const total = changelog.length;

  let next = current;
  if (action === "next")   next = Math.min(current + 1, total - 1);
  if (action === "prev")   next = Math.max(current - 1, 0);
  if (action === "latest") next = 0;

  await interaction.update({
    embeds: [buildEmbed(changelog[next], next, total)],
    components: [buildButtons(next, total)],
  });
}

module.exports = { handleUpdatesNav };
