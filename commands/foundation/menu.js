const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { withOwnerExtras } = require("../../utils/ownerResponse");
const config = require("../../config");

const CATEGORY_LABELS = {
  foundation: "🏛️ Foundation",
  community:  "💡 Community",
  config:     "⚙️ Configuration",
  fun:        "🎉 Fun & Utility",
  moderation: "🛡️ Moderation",
  roles:      "🎨 Roles",
  setup:      "🧰 Setup",
  tickets:    "🎫 Tickets",
  social:     "💬 Social",
  economy:    "💰 Economy",
  automation: "🤖 Automation",
  infrastructure: "🧱 Infrastructure",
  premium:    "🚀 Premium",
};

function groupCommandsByFolder() {
  const root = path.join(__dirname, "..", "..", "commands");
  const grouped = {};
  for (const folder of fs.readdirSync(root)) {
    const folderPath = path.join(root, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    grouped[folder] = [];
    for (const file of fs.readdirSync(folderPath).filter((f) => f.endsWith(".js"))) {
      try {
        const cmd = require(path.join(folderPath, file));
        if (!cmd?.data?.name) continue;
        grouped[folder].push({
          name: cmd.data.name,
          description: cmd.data.description || "No description",
        });
      } catch {}
    }
    grouped[folder].sort((a, b) => a.name.localeCompare(b.name));
  }
  return grouped;
}

function buildOverviewEmbed(grouped) {
  const embed = new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle("📖 Command Menu")
    .setDescription(`Use the dropdown to browse commands by category.\nTotal commands: **${Object.values(grouped).flat().length}**`)
    .setTimestamp();
  for (const [folder, commands] of Object.entries(grouped)) {
    if (!commands.length) continue;
    const label = CATEGORY_LABELS[folder] || `📁 ${folder}`;
    embed.addFields({
      name: `${label} — ${commands.length}`,
      value: commands.map((c) => `\`/${c.name}\``).join(" · ").slice(0, 1024) || "—",
      inline: false,
    });
  }
  return embed;
}

function buildCategoryEmbed(grouped, folder) {
  const commands = grouped[folder] || [];
  const label = CATEGORY_LABELS[folder] || `📁 ${folder}`;
  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(label)
    .setDescription(commands.length ? commands.map((c) => `**/${c.name}** — ${c.description}`).join("\n").slice(0, 4000) : "No commands in this category.")
    .setTimestamp();
}

function buildSelect(grouped) {
  const options = Object.keys(grouped)
    .filter((f) => grouped[f].length)
    .map((f) => ({
      label: (CATEGORY_LABELS[f] || f).replace(/^[^ ]+ /, ""),
      value: f,
      emoji: (CATEGORY_LABELS[f] || "📁").split(" ")[0],
      description: `${grouped[f].length} command${grouped[f].length === 1 ? "" : "s"}`,
    }));
  options.unshift({ label: "Overview", value: "__overview", emoji: "🏠", description: "Back to the full command list" });
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId("menu:category").setPlaceholder("Pick a category…").addOptions(options.slice(0, 25))
  );
}

module.exports = {
  data: new SlashCommandBuilder().setName("menu").setDescription("Open the full command menu."),
  async execute(interaction) {
    const grouped = groupCommandsByFolder();
    const payload = { embeds: [buildOverviewEmbed(grouped)], components: [buildSelect(grouped)], ephemeral: true };
    await interaction.reply(withOwnerExtras(interaction, payload, {
      extras: {
        Categories: Object.keys(grouped).length,
        Commands: Object.values(grouped).flat().length,
      },
    }));
  },
  groupCommandsByFolder,
  buildOverviewEmbed,
  buildCategoryEmbed,
  buildSelect,
};
