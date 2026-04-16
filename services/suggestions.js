const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { db, getSettings } = require("../database/db");

function actionRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("suggestion:upvote").setLabel("Upvote").setEmoji("✅").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("suggestion:downvote").setLabel("Downvote").setEmoji("❌").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("suggestion:consider").setLabel("Consider").setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("suggestion:approve").setLabel("Approve").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("suggestion:deny").setLabel("Deny").setStyle(ButtonStyle.Danger)
    )
  ];
}

async function createSuggestion(interaction, content) {
  const settings = getSettings(interaction.guild.id);
  const channelId = settings.suggestionsChannelId;
  if (!channelId) throw new Error("Suggestions channel not set. Run /buildserver or configure it first.");

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) throw new Error("Suggestions channel not found.");

  const embed = new EmbedBuilder()
    .setColor("#C084FC")
    .setTitle("New Suggestion")
    .setDescription(content)
    .addFields(
      { name: "Author", value: `${interaction.user}`, inline: true },
      { name: "Status", value: "Pending", inline: true }
    )
    .setFooter({ text: `User ID: ${interaction.user.id}` })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed], components: actionRows() });
  db.prepare(`
    INSERT INTO suggestions (message_id, guild_id, channel_id, author_id, content, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(msg.id, interaction.guild.id, channel.id, interaction.user.id, content);

  // Phase 3 addition — auto-spawn discussion thread if feature enabled.
  // Never throws; failure is silent so the suggestion still works.
  try {
    const { isEnabled } = require("./featureToggles");
    if (isEnabled(interaction.guild.id, "suggestionThreads") && msg.startThread) {
      const title = content.length > 90 ? content.slice(0, 87) + "…" : content;
      await msg.startThread({
        name: `💬 ${title}`,
        autoArchiveDuration: 1440,
        reason: "Suggestion discussion thread",
      }).catch(() => {});
    }
  } catch {}

  return msg;
}

async function updateSuggestionStatus(interaction, status) {
  const messageId = interaction.message.id;
  const record = db.prepare("SELECT * FROM suggestions WHERE message_id = ?").get(messageId);
  if (!record) return interaction.reply({ content: "Suggestion record not found.", ephemeral: true });

  db.prepare("UPDATE suggestions SET status = ? WHERE message_id = ?").run(status, messageId);

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  const fields = embed.data.fields || [];
  const nextFields = fields.map((f) => (f.name === "Status" ? { ...f, value: status } : f));
  embed.setFields(nextFields);

  await interaction.message.edit({ embeds: [embed] });
  return interaction.reply({ content: `Suggestion marked as ${status}.`, ephemeral: true });
}

module.exports = { createSuggestion, updateSuggestionStatus };
