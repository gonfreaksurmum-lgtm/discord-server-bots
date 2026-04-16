const { addXp } = require("../services/levels");
const sticky = require("../services/sticky");
const autoThread = require("../services/autoThread");
const mediaOnly = require("../services/mediaOnly");
const autoResponder = require("../services/autoResponder");
const { inspectMessage } = require("../services/automod");
const { getAfk, clearAfk } = require("../services/social");
const { maybeRespondToOwner } = require("../services/ownerMessage");
const { grantAchievement } = require("../services/premium");
const { handleCustomCommand } = require("../services/automationPlus");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    await addXp(message, Math.floor(Math.random() * 11) + 10);

    if (message.guild && !message.author.bot) {
      const afkSelf = getAfk(message.guild.id, message.author.id);
      if (afkSelf) {
        clearAfk(message.guild.id, message.author.id);
        await message.reply({ content: "Welcome back — your AFK status was cleared.", allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      for (const user of message.mentions.users.values()) {
        const afk = getAfk(message.guild.id, user.id);
        if (afk) {
          await message.reply({ content: `${user.tag} is AFK: ${afk.reason}`, allowedMentions: { repliedUser: false } }).catch(() => {});
          break;
        }
      }

      if ((message.content || "").length >= 250) {
        grantAchievement(message.guild.id, message.author.id, "LONG_MESSAGE");
      }
    }

    await Promise.allSettled([
      mediaOnly.handleMessage(message),
      autoResponder.handleMessage(message),
      autoThread.handleMessage(message),
      sticky.handleMessage(message),
      inspectMessage(message),
      maybeRespondToOwner(message),
      handleCustomCommand(message),
    ]);
  },
};
