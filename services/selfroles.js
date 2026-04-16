const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { roleBlueprint } = require("../data/blueprint");

const TYPES = {
  colors: [
    "Color • Pink",
    "Color • Purple",
    "Color • Blue",
    "Color • Cyan",
    "Color • Green",
    "Color • Lime",
    "Color • Yellow",
    "Color • Orange",
    "Color • Red",
    "Color • White",
    "Color • Black",
  ],
  pings: [
    "Ping • Announcements",
    "Ping • Giveaways",
    "Ping • Events",
    "Ping • Polls",
    "Ping • Media",
    "Ping • Updates",
  ],
  games: [
    "Game • Valorant",
    "Game • Fortnite",
    "Game • Minecraft",
    "Game • Roblox",
    "Game • GTA",
    "Game • COD",
    "Game • Apex",
    "Game • League",
  ],
  regions: [
    "Region • NA",
    "Region • EU",
    "Region • SA",
    "Region • ASIA",
    "Region • OCE",
  ],
};

function resolveRole(guild, logicalName) {
  const display = roleBlueprint[logicalName] || logicalName;
  return guild.roles.cache.find((r) => r.name === display || r.id === logicalName);
}

function makeRows(type, guild) {
  const names = TYPES[type];
  const roles = names.map((name) => resolveRole(guild, name)).filter(Boolean);

  const rows = [];
  for (let i = 0; i < roles.length; i += 5) {
    const row = new ActionRowBuilder();
    for (const role of roles.slice(i, i + 5)) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`selfrole:${type}:${role.id}`)
          .setLabel(role.name.replace(/^✦ /, "").replace(/^Color /, "").replace(/^Region /, ""))
          .setStyle(ButtonStyle.Secondary)
      );
    }
    rows.push(row);
  }
  return rows;
}

async function sendPanel(channel, type) {
  const embed = new EmbedBuilder()
    .setColor("#C084FC")
    .setTitle(`${type[0].toUpperCase() + type.slice(1)} Roles`)
    .setDescription("Click a button to toggle a role.")
    .setTimestamp();

  const rows = makeRows(type, channel.guild);
  return channel.send({ embeds: [embed], components: rows });
}

async function handleToggle(interaction, roleId) {
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) return interaction.reply({ content: "Role not found.", ephemeral: true });

  const member = interaction.member;
  const has = member.roles.cache.has(role.id);

  if (has) {
    await member.roles.remove(role, "Self-role toggle");
    return interaction.reply({ content: `Removed ${role.name}.`, ephemeral: true });
  }

  const exclusiveMatchers = [
    (name) => name.includes("Color "),
    (name) => name.includes("Region "),
  ];

  for (const match of exclusiveMatchers) {
    if (match(role.name)) {
      const toRemove = member.roles.cache.filter((r) => match(r.name));
      if (toRemove.size) await member.roles.remove(toRemove, "Exclusive self-role swap");
    }
  }

  await member.roles.add(role, "Self-role toggle");
  return interaction.reply({ content: `Added ${role.name}.`, ephemeral: true });
}

module.exports = { sendPanel, handleToggle, TYPES };
