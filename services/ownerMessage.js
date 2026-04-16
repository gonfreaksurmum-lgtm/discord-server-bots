const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { isOwner } = require("../utils/permissions");
const { getFeatureCounts } = require("./featureToggles");

const seen = new Map();

function shouldReply(message) {
  if (!message.guild || message.author.bot || !isOwner(message.author.id)) return false;
  const now = Date.now();
  const key = `${message.guild.id}:${message.author.id}`;
  const last = seen.get(key) || 0;

  // Always respond to explicit owner prompts or bot mentions.
  const explicit = /^\?(owner|panel|menu|status|features|updates)/i.test(message.content || "") ||
    message.mentions.has(message.client.user);

  // Otherwise keep a soft cadence so the owner still gets a custom response
  // without turning every chat line into spam.
  if (!explicit && now - last < 30_000) return false;

  seen.set(key, now);
  return true;
}

async function maybeRespondToOwner(message) {
  if (!shouldReply(message)) return;

  const counts = getFeatureCounts(message.guild.id);
  const embed = new EmbedBuilder()
    .setColor("#1F2937")
    .setTitle("👑 Owner Quick Panel")
    .setDescription("This is your owner-only helper panel for the current server.")
    .addFields(
      { name: "Message", value: `\`${(message.content || "(no content)").slice(0, 120)}\``, inline: false },
      { name: "Guild", value: `${message.guild.name}`, inline: true },
      { name: "Features", value: `${counts.enabled}/${counts.total} enabled`, inline: true },
      { name: "Latency", value: `${message.client.ws.ping}ms`, inline: true },
    )
    .setFooter({ text: "Slash commands: /menu • /features • /updates • /status" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ownerpanel:menu").setLabel("Menu").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ownerpanel:features").setLabel("Features").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ownerpanel:updates").setLabel("Updates").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ownerpanel:status").setLabel("Status").setStyle(ButtonStyle.Primary)
  );

  await message.reply({
    embeds: [embed],
    components: [row],
    allowedMentions: { repliedUser: false },
  }).catch(() => {});
}

module.exports = { maybeRespondToOwner };
