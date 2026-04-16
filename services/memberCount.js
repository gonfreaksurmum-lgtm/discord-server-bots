async function updateMemberCounter(guild) {
  const total = guild.memberCount;
  const botCount = guild.members.cache.filter((m) => m.user.bot).size;
  const boosts = guild.premiumSubscriptionCount || 0;

  const targets = guild.channels.cache.filter((c) => c.isVoiceBased());

  const membersChannel = targets.find((c) => /Members: /.test(c.name));
  const botsChannel = targets.find((c) => /Bots: /.test(c.name));
  const boostsChannel = targets.find((c) => /Boosts: /.test(c.name));

  if (membersChannel && membersChannel.name !== `✦ Members: ${total}`) {
    await membersChannel.setName(`✦ Members: ${total}`).catch(() => {});
  }
  if (botsChannel && botsChannel.name !== `✦ Bots: ${botCount}`) {
    await botsChannel.setName(`✦ Bots: ${botCount}`).catch(() => {});
  }
  if (boostsChannel && boostsChannel.name !== `✦ Boosts: ${boosts}`) {
    await boostsChannel.setName(`✦ Boosts: ${boosts}`).catch(() => {});
  }
}

module.exports = { updateMemberCounter };
