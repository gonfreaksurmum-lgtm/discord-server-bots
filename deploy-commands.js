const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const commands = [];
const root = path.join(__dirname, 'commands');

for (const folder of fs.readdirSync(root)) {
  const folderPath = path.join(root, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  for (const file of fs.readdirSync(folderPath).filter((f) => f.endsWith('.js'))) {
    const command = require(path.join(folderPath, file));
    if (command?.data?.toJSON) commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`Deploying ${commands.length} global commands...`);
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );
    console.log('Global commands deployed.');
  } catch (error) {
    console.error(error);
  }
})();