require('dotenv').config({ path: './.env' });

module.exports = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  ownerIds: (process.env.OWNER_IDS || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean),
  embedColor: process.env.EMBED_COLOR || '#C084FC',
};