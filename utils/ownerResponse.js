const { EmbedBuilder } = require("discord.js");
const { isOwner } = require("../utils/permissions");
const config = require("../config");

function buildOwnerEmbed(interaction, extras = {}) {
  const fields = [
    { name: "Guild", value: `\`${interaction.guild?.id || "DM"}\``, inline: true },
    { name: "User", value: `\`${interaction.user.id}\``, inline: true },
    { name: "Cmd", value: `\`${interaction.commandName || interaction.customId || "—"}\``, inline: true },
    { name: "WS Ping", value: `${interaction.client?.ws?.ping ?? "?"}ms`, inline: true },
    { name: "Shard Uptime", value: `${Math.floor(process.uptime())}s`, inline: true },
  ];

  for (const [k, v] of Object.entries(extras)) {
    fields.push({ name: k, value: String(v).slice(0, 1024), inline: true });
  }

  return new EmbedBuilder()
    .setColor("#1F2937")
    .setAuthor({ name: "👑 Owner View" })
    .addFields(fields.slice(0, 25))
    .setFooter({ text: "Extra diagnostics are only visible to configured owners." });
}

function withOwnerExtras(interaction, payload = {}, options = {}) {
  if (!isOwner(interaction.user.id)) return payload;
  const ownerEmbed = buildOwnerEmbed(interaction, options.extras || {});
  const existingEmbeds = Array.isArray(payload.embeds) ? payload.embeds : [];
  return { ...payload, embeds: [...existingEmbeds, ownerEmbed] };
}

function ownerSuffix(userId, extras = {}) {
  if (!isOwner(userId)) return "";
  const parts = Object.entries(extras).map(([k, v]) => `${k}=${v}`);
  return `\n\n-# 👑 ${parts.join(" · ") || "owner"}`;
}

function ownerColor() {
  return "#1F2937";
}

function normalColor() {
  return config.embedColor;
}

module.exports = { withOwnerExtras, ownerSuffix, ownerColor, normalColor, buildOwnerEmbed };
