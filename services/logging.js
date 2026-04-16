const { EmbedBuilder } = require("discord.js");
const { getSettings } = require("../database/db");

async function sendLog(guild, key, title, description) {
  const settings = getSettings(guild.id);
  const channelId = settings[key];
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor("#C084FC")
        .setTitle(title)
        .setDescription(description)
        .setTimestamp(),
    ],
  }).catch(() => {});
}

module.exports = { sendLog };
