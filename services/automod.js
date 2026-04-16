const { db } = require("../database/db");
const { isEnabled } = require("./featureToggles");

const recentMessages = new Map();
const linkRegex = /(https?:\/\/|discord\.gg\/|www\.)/i;

function pushMessage(guildId, userId, createdAt) {
  const key = `${guildId}:${userId}`;
  const items = recentMessages.get(key) || [];
  items.push(createdAt);
  const cutoff = createdAt - 12_000;
  const trimmed = items.filter((t) => t >= cutoff);
  recentMessages.set(key, trimmed);
  return trimmed;
}

function hasBypass(member) {
  return member.permissions.has("ManageMessages") || member.permissions.has("Administrator");
}

async function inspectMessage(message) {
  if (!message.guild || message.author.bot) return null;
  if (hasBypass(message.member)) return null;

  const content = message.content || "";

  if (isEnabled(message.guild.id, "antiSpam")) {
    const timestamps = pushMessage(message.guild.id, message.author.id, Date.now());
    const duplicateSpam = timestamps.length >= 6;
    if (duplicateSpam) {
      await message.delete().catch(() => {});
      await message.channel.send({
        content: `${message.author}, please slow down — anti-spam removed your message.`,
        allowedMentions: { users: [message.author.id] },
      }).then((m) => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
      return "spam";
    }
  }

  if (isEnabled(message.guild.id, "antiLink") && linkRegex.test(content)) {
    await message.delete().catch(() => {});
    await message.channel.send({
      content: `${message.author}, links are currently blocked here.`,
      allowedMentions: { users: [message.author.id] },
    }).then((m) => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
    return "link";
  }

  return null;
}

module.exports = { inspectMessage };
