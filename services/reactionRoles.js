// ============================================================================
// REACTION ROLE (SELECT MENU)
// ----------------------------------------------------------------------------
// This is a NEW panel type. Existing button-based /selfrole-panel is NOT
// touched and keeps working. Admins can use either.
//
// Modes:
//   multi  — user can pick any combination, toggle on re-select
//   single — user can only pick one at a time (removes others in the panel)
//   unique — once picked, user can't change (one-shot)
// ============================================================================

const {
  ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder,
} = require("discord.js");
const { db } = require("../database/db");
const { isEnabled } = require("./featureToggles");
const config = require("../config");

function storePanel({ messageId, guildId, channelId, title, description, mode, options, createdBy }) {
  db.prepare(`
    INSERT INTO reaction_role_panels
      (message_id, guild_id, channel_id, title, description, mode, options_json, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    messageId, guildId, channelId,
    title, description || null,
    mode, JSON.stringify(options),
    createdBy, Date.now()
  );
}

function getPanel(messageId) {
  const row = db.prepare("SELECT * FROM reaction_role_panels WHERE message_id = ?").get(messageId);
  if (!row) return null;
  try { row.options = JSON.parse(row.options_json); } catch { row.options = []; }
  return row;
}

function buildComponents(panel) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`reactionrole:${panel.message_id || "new"}`)
    .setPlaceholder("Select roles…")
    .setMinValues(0)
    .setMaxValues(panel.mode === "multi" ? Math.min(panel.options.length, 25) : 1);

  for (const opt of panel.options) {
    menu.addOptions({
      label: opt.label?.slice(0, 100) || "Option",
      value: opt.roleId,
      description: opt.description?.slice(0, 100) || undefined,
      emoji: opt.emoji || undefined,
    });
  }

  return [new ActionRowBuilder().addComponents(menu)];
}

async function sendPanel({ channel, title, description, mode, options, createdBy }) {
  const embed = new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(title)
    .setDescription(description || "Pick roles from the menu below.")
    .setTimestamp();

  const tempPanel = { message_id: "new", options, mode };
  const msg = await channel.send({ embeds: [embed], components: buildComponents(tempPanel) });

  // Persist with real message ID
  storePanel({
    messageId: msg.id, guildId: channel.guild.id, channelId: channel.id,
    title, description, mode, options, createdBy,
  });

  // Rebuild with proper customId embedding the message_id
  const stored = getPanel(msg.id);
  await msg.edit({ embeds: [embed], components: buildComponents(stored) }).catch(() => {});
  return msg;
}

async function handleSelect(interaction) {
  // customId format: reactionrole:<messageId>
  const messageId = interaction.customId.split(":")[1];
  const panel = getPanel(messageId);
  if (!panel) return interaction.reply({ content: "This panel is no longer active.", ephemeral: true });

  if (!isEnabled(interaction.guild.id, "reactionRoleSelect")) {
    return interaction.reply({ content: "Reaction role panels are disabled in this server.", ephemeral: true });
  }

  const selected = new Set(interaction.values);
  const panelRoleIds = panel.options.map((o) => o.roleId);
  const member = interaction.member;

  const added = [];
  const removed = [];

  if (panel.mode === "unique") {
    // Only add — prevent changes if user already has one of the panel roles
    const already = panelRoleIds.filter((id) => member.roles.cache.has(id));
    if (already.length) {
      return interaction.reply({ content: "You already claimed a role from this panel — it's one-shot.", ephemeral: true });
    }
    for (const id of selected) {
      await member.roles.add(id, "Reaction role panel").catch(() => {});
      added.push(id);
    }
  } else if (panel.mode === "single") {
    // Remove any other panel role first
    for (const id of panelRoleIds) {
      if (member.roles.cache.has(id) && !selected.has(id)) {
        await member.roles.remove(id, "Reaction role panel (single)").catch(() => {});
        removed.push(id);
      }
    }
    for (const id of selected) {
      if (!member.roles.cache.has(id)) {
        await member.roles.add(id, "Reaction role panel").catch(() => {});
        added.push(id);
      }
    }
  } else {
    // multi — toggle semantics
    for (const id of panelRoleIds) {
      const nowSelected = selected.has(id);
      const hasIt = member.roles.cache.has(id);
      if (nowSelected && !hasIt) {
        await member.roles.add(id, "Reaction role panel").catch(() => {});
        added.push(id);
      } else if (!nowSelected && hasIt) {
        await member.roles.remove(id, "Reaction role panel").catch(() => {});
        removed.push(id);
      }
    }
  }

  const parts = [];
  if (added.length)   parts.push(`Added: ${added.map((r) => `<@&${r}>`).join(", ")}`);
  if (removed.length) parts.push(`Removed: ${removed.map((r) => `<@&${r}>`).join(", ")}`);
  return interaction.reply({ content: parts.join("\n") || "No changes.", ephemeral: true });
}

module.exports = { sendPanel, getPanel, handleSelect, buildComponents };
