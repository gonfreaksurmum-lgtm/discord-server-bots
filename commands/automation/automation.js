const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { parseDuration } = require("../../utils/duration");
const {
  addReminder, listUserReminders, deleteReminder,
  setBirthday, listBirthdays,
  scheduleAnnouncement, listSchedules,
  addCustomCommand, removeCustomCommand, listCustomCommands,
} = require("../../services/automationPlus");
const { successEmbed, infoEmbed } = require("../../utils/embeds");
const { canManageBot } = require("../../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automation")
    .setDescription("Reminders, birthdays, scheduling, and custom commands.")
    .addSubcommand((s) => s.setName("remind").setDescription("Set a reminder")
      .addStringOption((o) => o.setName("when").setDescription("1h, 2d, 30m").setRequired(true))
      .addStringOption((o) => o.setName("text").setDescription("Reminder text").setRequired(true)))
    .addSubcommand((s) => s.setName("reminders").setDescription("List your active reminders"))
    .addSubcommand((s) => s.setName("reminder-delete").setDescription("Delete one of your reminders")
      .addIntegerOption((o) => o.setName("id").setDescription("Reminder id").setRequired(true)))
    .addSubcommand((s) => s.setName("birthday").setDescription("Set your birthday")
      .addIntegerOption((o) => o.setName("month").setDescription("Month 1-12").setRequired(true))
      .addIntegerOption((o) => o.setName("day").setDescription("Day 1-31").setRequired(true)))
    .addSubcommand((s) => s.setName("birthdays").setDescription("List saved birthdays"))
    .addSubcommand((s) => s.setName("schedule").setDescription("Schedule an announcement")
      .addChannelOption((o) => o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((o) => o.setName("when").setDescription("1h, 2d, 30m").setRequired(true))
      .addStringOption((o) => o.setName("title").setDescription("Title").setRequired(true))
      .addStringOption((o) => o.setName("text").setDescription("Message").setRequired(true)))
    .addSubcommand((s) => s.setName("schedules").setDescription("List pending scheduled announcements"))
    .addSubcommand((s) => s.setName("customcommand-add").setDescription("Add a custom command trigger")
      .addStringOption((o) => o.setName("trigger").setDescription("Trigger word").setRequired(true))
      .addStringOption((o) => o.setName("response").setDescription("Response").setRequired(true)))
    .addSubcommand((s) => s.setName("customcommand-remove").setDescription("Remove a custom command trigger")
      .addStringOption((o) => o.setName("trigger").setDescription("Trigger word").setRequired(true)))
    .addSubcommand((s) => s.setName("customcommand-list").setDescription("List custom commands")),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "remind") {
      const when = parseDuration(interaction.options.getString("when", true));
      if (!when) throw new Error("Invalid reminder duration.");
      const id = addReminder(interaction.user.id, interaction.guild.id, interaction.channel.id, interaction.options.getString("text", true), Date.now() + when);
      return interaction.reply({ embeds: [successEmbed(`Reminder created. ID: **${id}**`)], ephemeral: true });
    }

    if (sub === "reminders") {
      const rows = listUserReminders(interaction.user.id, interaction.guild.id);
      return interaction.reply({ embeds: [infoEmbed("Your Reminders", rows.length ? rows.map((r) => `#${r.id} • <t:${Math.floor(r.remind_at / 1000)}:R> • ${r.content}`).join("\n") : "No active reminders.")], ephemeral: true });
    }

    if (sub === "reminder-delete") {
      const ok = deleteReminder(interaction.options.getInteger("id", true), interaction.user.id);
      if (!ok) throw new Error("Reminder not found.");
      return interaction.reply({ embeds: [successEmbed("Reminder deleted.")], ephemeral: true });
    }

    if (sub === "birthday") {
      const month = interaction.options.getInteger("month", true);
      const day = interaction.options.getInteger("day", true);
      if (month < 1 || month > 12 || day < 1 || day > 31) throw new Error("Invalid date.");
      setBirthday(interaction.guild.id, interaction.user.id, month, day, "UTC");
      return interaction.reply({ embeds: [successEmbed("Birthday saved.")], ephemeral: true });
    }

    if (sub === "birthdays") {
      const rows = listBirthdays(interaction.guild.id);
      return interaction.reply({ embeds: [infoEmbed("Birthdays", rows.length ? rows.map((r) => `<@${r.user_id}> • ${r.month}/${r.day}`).join("\n") : "No birthdays saved yet.")] });
    }

    if (sub === "schedule") {
      if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
      const when = parseDuration(interaction.options.getString("when", true));
      if (!when) throw new Error("Invalid schedule duration.");
      const id = scheduleAnnouncement(
        interaction.guild.id,
        interaction.options.getChannel("channel", true).id,
        interaction.options.getString("title", true),
        interaction.options.getString("text", true),
        Date.now() + when,
        interaction.user.id
      );
      return interaction.reply({ embeds: [successEmbed(`Scheduled announcement #${id}.`)], ephemeral: true });
    }

    if (sub === "schedules") {
      const rows = listSchedules(interaction.guild.id);
      return interaction.reply({ embeds: [infoEmbed("Scheduled Announcements", rows.length ? rows.map((r) => `#${r.id} • <t:${Math.floor(r.send_at / 1000)}:R> • **${r.title}**`).join("\n") : "No pending schedules.")] });
    }

    if (sub === "customcommand-add") {
      if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
      addCustomCommand(interaction.guild.id, interaction.options.getString("trigger", true), interaction.options.getString("response", true), interaction.user.id);
      return interaction.reply({ embeds: [successEmbed("Custom command saved.")], ephemeral: true });
    }

    if (sub === "customcommand-remove") {
      if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
      const removed = removeCustomCommand(interaction.guild.id, interaction.options.getString("trigger", true));
      return interaction.reply({ embeds: [successEmbed(removed ? "Custom command removed." : "No matching custom command found.")], ephemeral: true });
    }

    if (sub === "customcommand-list") {
      const rows = listCustomCommands(interaction.guild.id);
      return interaction.reply({ embeds: [infoEmbed("Custom Commands", rows.length ? rows.map((r) => `\`${r.trigger}\` → ${r.response}`).join("\n").slice(0, 4000) : "No custom commands saved.")] });
    }
  },
};
