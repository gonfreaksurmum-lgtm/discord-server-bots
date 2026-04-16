const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { db } = require("../../database/db");
const { getLeaderboard, getUser } = require("../../services/levels");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("utility")
    .setDescription("Utility and fun commands")
    .addSubcommand((s) => s.setName("avatar").setDescription("View a user's avatar").addUserOption((o) => o.setName("user").setDescription("Target").setRequired(false)))
    .addSubcommand((s) => s.setName("userinfo").setDescription("View user info").addUserOption((o) => o.setName("user").setDescription("Target").setRequired(false)))
    .addSubcommand((s) => s.setName("serverstats").setDescription("View server stats"))
    .addSubcommand((s) => s.setName("coinflip").setDescription("Flip a coin"))
    .addSubcommand((s) => s.setName("8ball").setDescription("Ask the 8ball").addStringOption((o) => o.setName("question").setDescription("Question").setRequired(true)))
    .addSubcommand((s) => s.setName("rps").setDescription("Rock paper scissors").addStringOption((o) => o.setName("choice").setDescription("Pick one").setRequired(true).addChoices(
      { name: "rock", value: "rock" },
      { name: "paper", value: "paper" },
      { name: "scissors", value: "scissors" }
    )))
    .addSubcommand((s) => s.setName("snipe").setDescription("Recover the last deleted message"))
    .addSubcommand((s) => s.setName("rank").setDescription("View your rank").addUserOption((o) => o.setName("user").setDescription("Target").setRequired(false)))
    .addSubcommand((s) => s.setName("leaderboard").setDescription("View level leaderboard")),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "avatar") {
      const user = interaction.options.getUser("user") || interaction.user;
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor("#C084FC").setTitle(`${user.username}'s Avatar`).setImage(user.displayAvatarURL({ size: 1024 }))]
      });
    }

    if (sub === "userinfo") {
      const user = interaction.options.getUser("user") || interaction.user;
      const member = await interaction.guild.members.fetch(user.id);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#C084FC")
            .setTitle(`${user.tag}`)
            .addFields(
              { name: "ID", value: user.id, inline: true },
              { name: "Joined", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
              { name: "Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
            )
        ]
      });
    }

    if (sub === "serverstats") {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#C084FC")
            .setTitle(`${interaction.guild.name} Stats`)
            .addFields(
              { name: "Members", value: `${interaction.guild.memberCount}`, inline: true },
              { name: "Roles", value: `${interaction.guild.roles.cache.size}`, inline: true },
              { name: "Channels", value: `${interaction.guild.channels.cache.size}`, inline: true }
            )
        ]
      });
    }

    if (sub === "coinflip") {
      return interaction.reply(Math.random() < 0.5 ? "Heads" : "Tails");
    }

    if (sub === "8ball") {
      const replies = ["Yes", "No", "Maybe", "Probably", "Absolutely", "Not likely"];
      return interaction.reply(replies[Math.floor(Math.random() * replies.length)]);
    }

    if (sub === "rps") {
      const userChoice = interaction.options.getString("choice", true);
      const options = ["rock", "paper", "scissors"];
      const botChoice = options[Math.floor(Math.random() * options.length)];
      const wins =
        (userChoice === "rock" && botChoice === "scissors") ||
        (userChoice === "paper" && botChoice === "rock") ||
        (userChoice === "scissors" && botChoice === "paper");
      const draw = userChoice === botChoice;
      return interaction.reply(`You: **${userChoice}**\nBot: **${botChoice}**\nResult: **${draw ? "Draw" : wins ? "You win" : "You lose"}**`);
    }

    if (sub === "snipe") {
      const row = db.prepare("SELECT * FROM snipes WHERE channel_id = ?").get(interaction.channel.id);
      if (!row) throw new Error("Nothing to snipe here.");
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#C084FC")
            .setTitle("Sniped Message")
            .setDescription(row.content || "*No text content*")
            .setFooter({ text: `Author ID: ${row.author_id}` })
        ]
      });
    }

    if (sub === "rank") {
      const user = interaction.options.getUser("user") || interaction.user;
      const row = getUser(interaction.guild.id, user.id);
      return interaction.reply(`${user} • Level **${row?.level || 0}** • XP **${row?.xp || 0}**`);
    }

    if (sub === "leaderboard") {
      const rows = getLeaderboard(interaction.guild.id, 10);
      const lines = rows.map((row, i) => `${i + 1}. <@${row.user_id}> • Level ${row.level} • XP ${row.xp}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder().setColor("#C084FC").setTitle("Leaderboard").setDescription(lines.join("\n") || "No data yet.")
        ]
      });
    }
  },
};
