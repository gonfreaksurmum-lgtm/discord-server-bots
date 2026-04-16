const { db } = require("../database/db");
const { EmbedBuilder } = require("discord.js");
const { isEnabled } = require("./featureToggles");

function addReminder(userId, guildId, channelId, content, remindAt) {
  return db.prepare(`
    INSERT INTO reminders (user_id, guild_id, channel_id, content, remind_at, sent)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(userId, guildId || null, channelId || null, content, remindAt).lastInsertRowid;
}

function listUserReminders(userId, guildId) {
  return db.prepare(`
    SELECT * FROM reminders
    WHERE user_id = ? AND guild_id = ? AND sent = 0
    ORDER BY remind_at ASC
    LIMIT 20
  `).all(userId, guildId);
}

function deleteReminder(id, userId) {
  const res = db.prepare("DELETE FROM reminders WHERE id = ? AND user_id = ?").run(id, userId);
  return res.changes > 0;
}

function setBirthday(guildId, userId, month, day, timezone = "UTC") {
  db.prepare(`
    INSERT INTO birthdays (guild_id, user_id, month, day, timezone)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET month = excluded.month, day = excluded.day, timezone = excluded.timezone
  `).run(guildId, userId, month, day, timezone);
}

function listBirthdays(guildId) {
  return db.prepare(`
    SELECT * FROM birthdays
    WHERE guild_id = ?
    ORDER BY month ASC, day ASC
    LIMIT 25
  `).all(guildId);
}

function scheduleAnnouncement(guildId, channelId, title, content, sendAt, createdBy) {
  return db.prepare(`
    INSERT INTO scheduled_announcements (guild_id, channel_id, title, content, send_at, created_by, sent)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(guildId, channelId, title, content, sendAt, createdBy).lastInsertRowid;
}

function listSchedules(guildId) {
  return db.prepare(`
    SELECT * FROM scheduled_announcements
    WHERE guild_id = ? AND sent = 0
    ORDER BY send_at ASC
    LIMIT 20
  `).all(guildId);
}

function addCustomCommand(guildId, trigger, response, createdBy) {
  db.prepare(`
    INSERT OR REPLACE INTO custom_commands (guild_id, trigger, response, created_by, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(guildId, trigger.toLowerCase(), response, createdBy, Date.now());
}

function removeCustomCommand(guildId, trigger) {
  return db.prepare("DELETE FROM custom_commands WHERE guild_id = ? AND trigger = ?")
    .run(guildId, trigger.toLowerCase()).changes > 0;
}

function listCustomCommands(guildId) {
  return db.prepare("SELECT * FROM custom_commands WHERE guild_id = ? ORDER BY trigger ASC LIMIT 25").all(guildId);
}

async function handleCustomCommand(message) {
  if (!message.guild || message.author.bot) return;
  if (!isEnabled(message.guild.id, "customCommands")) return;

  const content = (message.content || "").trim().toLowerCase();
  if (!content) return;
  const row = db.prepare("SELECT * FROM custom_commands WHERE guild_id = ? AND trigger = ?").get(message.guild.id, content);
  if (!row) return;

  await message.reply({ content: row.response, allowedMentions: { repliedUser: false } }).catch(() => {});
}

async function processAutomation(client) {
  const now = Date.now();

  for (const row of db.prepare("SELECT * FROM reminders WHERE sent = 0 AND remind_at <= ?").all(now)) {
    try {
      if (row.channel_id) {
        const ch = await client.channels.fetch(row.channel_id).catch(() => null);
        if (ch) await ch.send(`<@${row.user_id}> ⏰ Reminder: ${row.content}`);
      } else {
        const user = await client.users.fetch(row.user_id).catch(() => null);
        if (user) await user.send(`⏰ Reminder: ${row.content}`);
      }
    } catch {}
    db.prepare("UPDATE reminders SET sent = 1 WHERE id = ?").run(row.id);
  }

  for (const row of db.prepare("SELECT * FROM scheduled_announcements WHERE sent = 0 AND send_at <= ?").all(now)) {
    const channel = await client.channels.fetch(row.channel_id).catch(() => null);
    if (channel) {
      await channel.send({
        embeds: [new EmbedBuilder().setColor("#C084FC").setTitle(row.title).setDescription(row.content).setTimestamp()]
      }).catch(() => {});
    }
    db.prepare("UPDATE scheduled_announcements SET sent = 1 WHERE id = ?").run(row.id);
  }

  const today = new Date();
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();

  for (const row of db.prepare("SELECT * FROM birthdays WHERE month = ? AND day = ?").all(month, day)) {
    const key = `${row.guild_id}:${row.user_id}:${month}:${day}`;
    const sent = db.prepare("SELECT 1 FROM sent_birthdays WHERE unique_key = ?").get(key);
    if (sent) continue;

    const guild = client.guilds.cache.get(row.guild_id);
    if (!guild || !isEnabled(guild.id, "birthdays")) continue;
    const user = await client.users.fetch(row.user_id).catch(() => null);
    if (!user) continue;

    const systemChannel = guild.systemChannel;
    if (systemChannel) {
      await systemChannel.send(`🎂 Happy birthday <@${row.user_id}>!`).catch(() => {});
    }

    db.prepare("INSERT OR IGNORE INTO sent_birthdays (unique_key, sent_at) VALUES (?, ?)").run(key, now);
  }
}

module.exports = {
  addReminder,
  listUserReminders,
  deleteReminder,
  setBirthday,
  listBirthdays,
  scheduleAnnouncement,
  listSchedules,
  addCustomCommand,
  removeCustomCommand,
  listCustomCommands,
  handleCustomCommand,
  processAutomation,
};
