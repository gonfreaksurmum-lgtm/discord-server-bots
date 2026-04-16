const { EmbedBuilder } = require("discord.js");
const config = require("../config");

function baseEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(title)
    .setDescription(description || null)
    .setTimestamp();
}

function successEmbed(text) {
  return baseEmbed("Success", `✅ ${text}`);
}

function errorEmbed(text) {
  return baseEmbed("Error", `❌ ${text}`);
}

function infoEmbed(title, text) {
  return baseEmbed(title, text);
}

module.exports = { baseEmbed, successEmbed, errorEmbed, infoEmbed };
