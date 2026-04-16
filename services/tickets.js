const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { db, getSettings, setSettings } = require("../database/db");
const { saveTranscript } = require("./transcripts");

const DEFAULT_TICKET_TYPES = [
  { key: "general", label: "General", emoji: "🎫" },
  { key: "report", label: "Report", emoji: "🚨" },
  { key: "appeal", label: "Appeal", emoji: "🧷" },
  { key: "partnership", label: "Partnership", emoji: "🤝" },
];

function getTicketSystem(guildId) {
  const settings = getSettings(guildId);
  const system = settings.ticketSystem || {};
  const typeConfigs = system.typeConfigs || {};
  return {
    panel: {
      title: system.panel?.title || "Ticket Applications",
      description: system.panel?.description || "Open a ticket using one of the buttons below.",
      accentColor: system.panel?.accentColor || "#C084FC",
    },
    allowUserClose: system.allowUserClose !== false,
    claimerRoleIds: Array.isArray(system.claimerRoleIds) ? system.claimerRoleIds : [],
    typeConfigs,
  };
}

function saveTicketSystem(guildId, patch) {
  const settings = getSettings(guildId);
  const current = settings.ticketSystem || {};
  const next = { ...current, ...patch };
  setSettings(guildId, { ticketSystem: next });
  return next;
}

function getTypeEntries(guildId) {
  const system = getTicketSystem(guildId);
  const entries = Object.entries(system.typeConfigs || {}).map(([key, value]) => ({ key, ...value }));
  return entries.length ? entries : DEFAULT_TICKET_TYPES;
}

function buildPanelRows(guildId) {
  const entries = getTypeEntries(guildId);
  const rows = [];
  for (let i = 0; i < entries.length; i += 3) {
    const row = new ActionRowBuilder();
    for (const type of entries.slice(i, i + 3)) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket:create:${type.key}`)
          .setLabel(type.label)
          .setEmoji(type.emoji || "🎫")
          .setStyle(ButtonStyle.Secondary)
      );
    }
    rows.push(row);
  }
  return rows.slice(0, 5);
}

async function sendTicketPanel(channel) {
  const system = getTicketSystem(channel.guild.id);

  const embed = new EmbedBuilder()
    .setColor(system.panel.accentColor)
    .setTitle(system.panel.title)
    .setDescription(system.panel.description)
    .setFooter({ text: "Powered by your custom ticket system" })
    .setTimestamp();

  return channel.send({ embeds: [embed], components: buildPanelRows(channel.guild.id) });
}

function buildReasonModal(typeKey, typeLabel) {
  const modal = new ModalBuilder()
    .setCustomId(`ticketreason:create:${typeKey}`)
    .setTitle("Reason");

  const input = new TextInputBuilder()
    .setCustomId("reason")
    .setLabel(`Reason for ${typeLabel}`)
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Type reason here")
    .setRequired(true)
    .setMaxLength(1000);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

async function showCreateReasonModal(interaction, typeKey) {
  const types = getTypeEntries(interaction.guild.id);
  const type = types.find((t) => t.key === typeKey);
  if (!type) return interaction.reply({ content: "Unknown ticket type.", ephemeral: true });
  return interaction.showModal(buildReasonModal(typeKey, type.label));
}

function buildTicketControls(record, claimed = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ticket:close").setLabel("Close Ticket").setEmoji("🔒").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("ticket:claim").setLabel(claimed ? "Reclaim Ticket" : "Claim Ticket").setEmoji("📜").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("ticket:delete").setLabel("Delete Ticket").setEmoji("🗑️").setStyle(ButtonStyle.Secondary)
    )
  ];
}

async function createTicketChannel(guild, openerUser, typeKey, reason) {
  const settings = getSettings(guild.id);
  const system = getTicketSystem(guild.id);
  const type = system.typeConfigs?.[typeKey] || DEFAULT_TICKET_TYPES.find((t) => t.key === typeKey);

  if (!type) throw new Error("Unknown ticket type.");

  const existing = db.prepare(`
    SELECT * FROM tickets
    WHERE guild_id = ? AND user_id = ? AND status IN ('open', 'claimed')
  `).get(guild.id, openerUser.id);

  if (existing) {
    return { existingChannelId: existing.channel_id };
  }

  const everyoneId = guild.roles.everyone.id;
  const supportRoleIds = Array.isArray(type.supportRoleIds) ? type.supportRoleIds.filter(Boolean) : [];
  const categoryId = type.categoryId || settings.builtChannels?.["🎫 SUPPORT"]?.categoryId || null;

  const baseName = `${type.naming || typeKey}-${openerUser.username}`.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
  const channel = await guild.channels.create({
    name: `〢${baseName}`,
    type: ChannelType.GuildText,
    parent: categoryId,
    topic: `Ticket owner: ${openerUser.id} • type: ${typeKey}`,
    permissionOverwrites: [
      { id: everyoneId, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: openerUser.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ReadMessageHistory] },
      ...supportRoleIds.map((id) => ({ id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }))
    ]
  });

  db.prepare(`
    INSERT INTO tickets (guild_id, channel_id, user_id, type, status, created_at, metadata_json)
    VALUES (?, ?, ?, ?, 'open', ?, ?)
  `).run(guild.id, channel.id, openerUser.id, typeKey, Date.now(), JSON.stringify({ reason }));

  db.prepare(`
    INSERT INTO ticket_claims (channel_id, guild_id, user_id, claimer_id, reason, opened_at)
    VALUES (?, ?, ?, NULL, ?, ?)
    ON CONFLICT(channel_id) DO NOTHING
  `).run(channel.id, guild.id, openerUser.id, reason, Date.now());

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(system.panel.accentColor)
        .setTitle("Ticket Opened")
        .setDescription(`${openerUser} has created a new **${type.label}** ticket.`)
        .addFields(
          { name: "Reason", value: reason.slice(0, 1024) },
          { name: "Type", value: type.label, inline: true },
          { name: "Status", value: "Open", inline: true }
        )
        .setFooter({ text: "/close • /claim replacement buttons below" })
        .setTimestamp()
    ],
    components: buildTicketControls({ channel_id: channel.id }, false)
  });

  return { channelId: channel.id };
}

async function createTicketFromModal(interaction, typeKey) {
  const reason = interaction.fields.getTextInputValue("reason");
  const result = await createTicketChannel(interaction.guild, interaction.user, typeKey, reason);
  if (result.existingChannelId) {
    return interaction.reply({ content: `You already have an open ticket: <#${result.existingChannelId}>`, ephemeral: true });
  }
  return interaction.reply({ content: `Created ticket: <#${result.channelId}>`, ephemeral: true });
}

function memberCanClaim(member) {
  const system = getTicketSystem(member.guild.id);
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  return (system.claimerRoleIds || []).some((id) => member.roles.cache.has(id));
}

async function claimTicket(interaction) {
  const record = db.prepare("SELECT * FROM ticket_claims WHERE channel_id = ?").get(interaction.channel.id);
  const ticket = db.prepare("SELECT * FROM tickets WHERE channel_id = ?").get(interaction.channel.id);
  if (!record || !ticket) return interaction.reply({ content: "This channel is not a tracked ticket.", ephemeral: true });
  if (!memberCanClaim(interaction.member)) return interaction.reply({ content: "You cannot claim this ticket.", ephemeral: true });

  db.prepare(`
    UPDATE ticket_claims
    SET claimer_id = ?, claimed_at = ?
    WHERE channel_id = ?
  `).run(interaction.user.id, Date.now(), interaction.channel.id);

  db.prepare("UPDATE tickets SET status = 'claimed' WHERE channel_id = ?").run(interaction.channel.id);

  await interaction.channel.send(`📜 ${interaction.user} has claimed this ticket.`);
  return interaction.reply({ content: "Ticket claimed.", ephemeral: true });
}

async function updateTicketState(interaction, action) {
  const record = db.prepare("SELECT * FROM tickets WHERE channel_id = ?").get(interaction.channel.id);
  if (!record) return interaction.reply({ content: "This channel is not a tracked ticket.", ephemeral: true });

  const system = getTicketSystem(interaction.guild.id);
  const isOwner = record.user_id === interaction.user.id;
  const isClaimer = memberCanClaim(interaction.member);

  if (action === "claim") {
    return claimTicket(interaction);
  }

  if (action === "close") {
    if (!isClaimer && !(system.allowUserClose && isOwner)) {
      return interaction.reply({ content: "You cannot close this ticket.", ephemeral: true });
    }
    db.prepare("UPDATE tickets SET status = 'closed' WHERE channel_id = ?").run(interaction.channel.id);
    await interaction.channel.permissionOverwrites.edit(record.user_id, {
      SendMessages: false,
      ViewChannel: true,
      ReadMessageHistory: true
    });
    return interaction.reply({ content: "Ticket closed." });
  }

  if (action === "reopen") {
    if (!isClaimer) return interaction.reply({ content: "Only ticket staff can reopen.", ephemeral: true });
    db.prepare("UPDATE tickets SET status = 'open' WHERE channel_id = ?").run(interaction.channel.id);
    await interaction.channel.permissionOverwrites.edit(record.user_id, {
      SendMessages: true,
      ViewChannel: true,
      ReadMessageHistory: true
    });
    return interaction.reply({ content: "Ticket reopened." });
  }

  if (action === "delete") {
    if (!isClaimer) return interaction.reply({ content: "Only ticket staff can delete.", ephemeral: true });
    const settings = getSettings(interaction.guild.id);
    const transcriptPath = await saveTranscript(interaction.channel).catch(() => null);
    const transcriptChannel = settings.transcriptChannelId ? interaction.guild.channels.cache.get(settings.transcriptChannelId) : null;

    if (transcriptChannel && transcriptPath) {
      await transcriptChannel.send({
        content: `Transcript for **${interaction.channel.name}**`,
        files: [transcriptPath]
      }).catch(() => {});
    }

    db.prepare("DELETE FROM tickets WHERE channel_id = ?").run(interaction.channel.id);
    db.prepare("DELETE FROM ticket_claims WHERE channel_id = ?").run(interaction.channel.id);
    await interaction.reply({ content: "Deleting ticket channel..." });
    return interaction.channel.delete("Ticket deleted");
  }
}

function getTicketOverview(guildId) {
  const system = getTicketSystem(guildId);
  const types = Object.entries(system.typeConfigs || {});
  return {
    system,
    typeCount: types.length,
    types
  };
}

module.exports = {
  sendTicketPanel,
  showCreateReasonModal,
  createTicketFromModal,
  createTicketChannel,
  updateTicketState,
  getTicketSystem,
  saveTicketSystem,
  getTicketOverview
};
