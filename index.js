const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const { log } = require("./utils/logger");
const { processTempbans } = require("./services/tempbans");
const { endDueGiveaways } = require("./services/giveaways");
const { runMigrations } = require("./database/migrations");
const { processTimeouts } = require("./services/moderationPlus");
const { processAutomation } = require("./services/automationPlus");

runMigrations();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
client.buttons = new Collection();
client.selectMenus = new Collection();
client.modals = new Collection();

function loadFolderMap(folderPath, collection) {
  if (!fs.existsSync(folderPath)) return;
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(folderPath, entry.name);
    if (entry.isDirectory()) {
      loadFolderMap(full, collection);
      continue;
    }
    if (!entry.name.endsWith(".js")) continue;
    const item = require(full);
    if (item.customId) collection.set(item.customId, item);
  }
}

function loadCommands(dir) {
  const folders = fs.readdirSync(dir);
  for (const folder of folders) {
    const folderPath = path.join(dir, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".js"));
    for (const file of files) {
      const command = require(path.join(folderPath, file));
      client.commands.set(command.data.name, command);
    }
  }
}

function loadEvents(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));
  for (const file of files) {
    const event = require(path.join(dir, file));
    if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
    else client.on(event.name, (...args) => event.execute(...args, client));
  }
}

loadCommands(path.join(__dirname, "commands"));
loadFolderMap(path.join(__dirname, "components", "buttons"), client.buttons);
loadFolderMap(path.join(__dirname, "components", "selectMenus"), client.selectMenus);
loadFolderMap(path.join(__dirname, "components", "modals"), client.modals);
loadEvents(path.join(__dirname, "events"));

setInterval(() => {
  processTempbans(client).catch((e) => log("Tempban loop error", e));
  processTimeouts(client).catch((e) => log("Timeout loop error", e));
  endDueGiveaways(client).catch((e) => log("Giveaway loop error", e));
  processAutomation(client).catch((e) => log("Automation loop error", e));
}, 15_000);

client.login(config.token);
