const { sendLog } = require("../services/logging");
const { updateVoiceJoin, updateVoiceLeave } = require("../services/premium");
const { db } = require("../database/db");
const { ChannelType } = require("discord.js");
const { isEnabled } = require("../services/featureToggles");

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState) {
    const guild = newState.guild || oldState.guild;
    const user = newState.member?.user || oldState.member?.user;
    if (!guild || !user?.id || user.bot) return;

    if (!oldState.channelId && newState.channelId) {
      await sendLog(guild, "modLogChannelId", "Voice Joined", `${user.tag} joined ${newState.channel}`);
      updateVoiceJoin(user.id, guild.id, Date.now());

      if (isEnabled(guild.id, "joinToCreate")) {
        const config = db.prepare("SELECT * FROM jtc_configs WHERE guild_id = ?").get(guild.id);
        if (config && config.lobby_channel_id === newState.channelId) {
          const channel = await guild.channels.create({
            name: `${newState.member.user.username}'s Room`,
            type: ChannelType.GuildVoice,
            parent: config.category_id || null,
          });
          await newState.setChannel(channel).catch(() => {});
        }
      }
    }

    if (oldState.channelId && !newState.channelId) {
      await sendLog(guild, "modLogChannelId", "Voice Left", `${user.tag} left ${oldState.channel}`);
      updateVoiceLeave(user.id, guild.id, Date.now());

      if (oldState.channel && oldState.channel.name.endsWith("'s Room") && oldState.channel.members.size === 0) {
        await oldState.channel.delete("Join-to-create cleanup").catch(() => {});
      }
    }
  },
};
