const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getProfile, updateProfile, getRep, addRep, hasGivenRepToday, setAfk, getMarriage, marry, divorce } = require("../../services/social");
const { getUser } = require("../../services/levels");
const { getBalance, claimDaily } = require("../../services/economy");
const { getAchievements } = require("../../services/premium");
const { db } = require("../../database/db");
const { successEmbed, infoEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("social")
    .setDescription("Profiles, rep, AFK, marriage, and socials.")
    .addSubcommand((s) => s.setName("profile").setDescription("View a profile").addUserOption((o) => o.setName("user").setDescription("Target")))
    .addSubcommand((s) => s.setName("setprofile").setDescription("Update your profile")
      .addStringOption((o) => o.setName("bio").setDescription("Bio"))
      .addStringOption((o) => o.setName("pronouns").setDescription("Pronouns"))
      .addStringOption((o) => o.setName("color").setDescription("Favorite color")))
    .addSubcommand((s) => s.setName("rep").setDescription("Give reputation")
      .addUserOption((o) => o.setName("user").setDescription("Target").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason")))
    .addSubcommand((s) => s.setName("repleaderboard").setDescription("Top reputation users"))
    .addSubcommand((s) => s.setName("afk").setDescription("Set yourself AFK")
      .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(false)))
    .addSubcommand((s) => s.setName("marry").setDescription("Marry another user")
      .addUserOption((o) => o.setName("user").setDescription("Target").setRequired(true)))
    .addSubcommand((s) => s.setName("marriage").setDescription("View current marriage details").addUserOption((o) => o.setName("user").setDescription("Target")))
    .addSubcommand((s) => s.setName("divorce").setDescription("End your marriage"))
    .addSubcommand((s) => s.setName("daily").setDescription("Claim a social daily reward")),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "profile") {
      const user = interaction.options.getUser("user") || interaction.user;
      const profile = getProfile(interaction.guild.id, user.id) || {};
      const level = getUser(interaction.guild.id, user.id) || { level: 0, xp: 0 };
      const balance = getBalance(interaction.guild.id, user.id);
      const rep = getRep(interaction.guild.id, user.id);
      const marriage = getMarriage(interaction.guild.id, user.id);
      const achievements = getAchievements(interaction.guild.id, user.id);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(profile.favorite_color || "#C084FC")
          .setTitle(`${user.username}'s Profile`)
          .setDescription(profile.bio || "No bio set.")
          .addFields(
            { name: "Pronouns", value: profile.pronouns || "Not set", inline: true },
            { name: "Level", value: `${level.level}`, inline: true },
            { name: "Reputation", value: `${rep}`, inline: true },
            { name: "Wallet", value: `${balance.wallet}`, inline: true },
            { name: "Bank", value: `${balance.bank}`, inline: true },
            { name: "Achievements", value: `${achievements.length}`, inline: true },
            { name: "Marriage", value: marriage ? `<@${marriage.user1_id === user.id ? marriage.user2_id : marriage.user1_id}>` : "Single", inline: false }
          )
          .setThumbnail(user.displayAvatarURL())]
      });
    }

    if (sub === "setprofile") {
      const bio = interaction.options.getString("bio");
      const pronouns = interaction.options.getString("pronouns");
      const color = interaction.options.getString("color");
      updateProfile(interaction.guild.id, interaction.user.id, { bio, pronouns, favorite_color: color });
      return interaction.reply({ embeds: [successEmbed("Profile updated.")], ephemeral: true });
    }

    if (sub === "rep") {
      const user = interaction.options.getUser("user", true);
      if (user.id === interaction.user.id) throw new Error("You cannot rep yourself.");
      if (hasGivenRepToday(interaction.guild.id, interaction.user.id, user.id)) throw new Error("You already repped that user in the last 24 hours.");
      addRep(interaction.guild.id, interaction.user.id, user.id, interaction.options.getString("reason"));
      return interaction.reply({ embeds: [successEmbed(`You gave reputation to ${user}.`)] });
    }

    if (sub === "repleaderboard") {
      const rows = db.prepare(`
        SELECT receiver_id, COUNT(*) AS rep
        FROM reputation
        WHERE guild_id = ?
        GROUP BY receiver_id
        ORDER BY rep DESC
        LIMIT 10
      `).all(interaction.guild.id);
      return interaction.reply({ embeds: [infoEmbed("Reputation Leaderboard", rows.length ? rows.map((r, i) => `${i + 1}. <@${r.receiver_id}> • **${r.rep} rep**`).join("\n") : "No rep yet.")] });
    }

    if (sub === "afk") {
      setAfk(interaction.guild.id, interaction.user.id, interaction.options.getString("reason") || "AFK");
      return interaction.reply({ embeds: [successEmbed("You are now AFK.")], ephemeral: true });
    }

    if (sub === "marry") {
      const user = interaction.options.getUser("user", true);
      if (user.id === interaction.user.id) throw new Error("You cannot marry yourself.");
      if (getMarriage(interaction.guild.id, interaction.user.id) || getMarriage(interaction.guild.id, user.id)) throw new Error("One of you is already married.");
      marry(interaction.guild.id, interaction.user.id, user.id);
      return interaction.reply({ embeds: [successEmbed(`💍 ${interaction.user} is now married to ${user}.`)] });
    }

    if (sub === "marriage") {
      const user = interaction.options.getUser("user") || interaction.user;
      const row = getMarriage(interaction.guild.id, user.id);
      if (!row) throw new Error("That user is not married.");
      const partnerId = row.user1_id === user.id ? row.user2_id : row.user1_id;
      return interaction.reply({ embeds: [infoEmbed("Marriage", `${user} is married to <@${partnerId}> since <t:${Math.floor(row.married_at / 1000)}:D>.`)] });
    }

    if (sub === "divorce") {
      if (!getMarriage(interaction.guild.id, interaction.user.id)) throw new Error("You are not married.");
      divorce(interaction.guild.id, interaction.user.id);
      return interaction.reply({ embeds: [successEmbed("Marriage ended.")], ephemeral: true });
    }

    if (sub === "daily") {
      const amount = claimDaily(interaction.guild.id, interaction.user.id);
      return interaction.reply({ embeds: [successEmbed(`You claimed your daily social reward of ${amount} coins.`)] });
    }
  },
};
