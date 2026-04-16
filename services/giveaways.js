const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const { db, getSettings } = require("../database/db");
const { createTicketChannel } = require("./tickets");

function parseEntries(json) {
  try {
    return JSON.parse(json || "[]");
  } catch {
    return [];
  }
}

function parseMeta(record) {
  try {
    return JSON.parse(record.metadata_json || "{}");
  } catch {
    return {};
  }
}

function serializeEntries(entries) {
  return JSON.stringify(entries);
}

function getEntryCountForMember(member, meta) {
  let entries = 1;
  if (meta.bonusRoleId && meta.bonusEntries && member.roles.cache.has(meta.bonusRoleId)) {
    entries += Number(meta.bonusEntries) || 0;
  }
  return entries;
}

function giveawayRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("giveaway:enter").setLabel("Enter").setEmoji("🎉").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("giveaway:entries").setLabel("Participants").setEmoji("👥").setStyle(ButtonStyle.Secondary)
    )
  ];
}

function buildGiveawayEmbed(hostId, prize, endsAt, winnerCount, meta = {}, entries = []) {
  const lines = [
    meta.description || `Click 🎉 button to enter!`,
    `Winners: **${winnerCount}**`,
    `Ends: <t:${Math.floor(endsAt / 1000)}:R>`,
    "",
  ];

  if (entries.length) {
    lines.push("**Extra Entries:**");
    for (const item of entries.slice(0, 10)) {
      const count = item.count || 1;
      lines.push(`<@${item.userId}>: **${count}** ${count === 1 ? "entry" : "entries"}`);
    }
    if (entries.length > 10) lines.push(`...and ${entries.length - 10} more`);
    lines.push("");
  }

  if (meta.requirementText) lines.push(`Must have: ${meta.requirementText}`);
  if (meta.bypassRoleId) lines.push(`Requirements Bypass Role: <@&${meta.bypassRoleId}>`);
  if (meta.blacklistRoleId) lines.push(`Must not have the role: <@&${meta.blacklistRoleId}>`);
  if (meta.grantWinnerRoleId) lines.push(`Winners will get the role: <@&${meta.grantWinnerRoleId}>`);
  if (meta.grantPermissionRoleId) lines.push(`Winners will gain custom role access: <@&${meta.grantPermissionRoleId}>`);
  if (meta.claimRequired) lines.push(`Claim required: Winners must open a claim ticket.`);
  lines.push("");
  lines.push(`Ends at • <t:${Math.floor(endsAt / 1000)}:f>`);

  return new EmbedBuilder()
    .setColor(meta.color || "#60A5FA")
    .setTitle(prize)
    .setDescription(lines.join("\n"))
    .setFooter({ text: `Hosted by ${hostId}` })
    .setTimestamp();
}

async function createGiveaway(channel, hostId, durationMs, prize, winnerCount = 1, meta = {}) {
  const endsAt = Date.now() + durationMs;
  const embed = buildGiveawayEmbed(hostId, prize, endsAt, winnerCount, meta, []);
  const message = await channel.send({ embeds: [embed], components: giveawayRows() });

  db.prepare(`
    INSERT INTO giveaways (message_id, guild_id, channel_id, host_id, prize, winner_count, ends_at, ended, entry_json, metadata_json, winner_ids_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, '[]', ?, '[]')
  `).run(message.id, channel.guild.id, channel.id, hostId, prize, winnerCount, endsAt, JSON.stringify(meta));

  return message;
}

function getUniqueParticipants(entries) {
  const map = new Map();
  for (const entry of entries) {
    map.set(entry.userId, entry);
  }
  return Array.from(map.values());
}

async function handleGiveawayButton(interaction, action) {
  const record = db.prepare("SELECT * FROM giveaways WHERE message_id = ?").get(interaction.message.id);
  if (!record) return interaction.reply({ content: "Giveaway not found.", ephemeral: true });

  let entries = parseEntries(record.entry_json);
  const meta = parseMeta(record);

  if (action === "enter") {
    if (record.ended) return interaction.reply({ content: "This giveaway already ended.", ephemeral: true });

    const member = interaction.member;
    if (meta.requiredRoleId && !member.roles.cache.has(meta.requiredRoleId) && !(meta.bypassRoleId && member.roles.cache.has(meta.bypassRoleId))) {
      return interaction.reply({ content: "You do not meet the giveaway role requirement.", ephemeral: true });
    }
    if (meta.blacklistRoleId && member.roles.cache.has(meta.blacklistRoleId)) {
      return interaction.reply({ content: "You are blacklisted from this giveaway.", ephemeral: true });
    }

    const existing = entries.find((e) => e.userId === interaction.user.id);
    if (existing) {
      return interaction.reply({ content: `You already entered with **${existing.count}** entries.`, ephemeral: true });
    }

    const count = getEntryCountForMember(member, meta);
    entries.push({ userId: interaction.user.id, count, joinedAt: Date.now() });
    db.prepare("UPDATE giveaways SET entry_json = ? WHERE message_id = ?")
      .run(serializeEntries(entries), record.message_id);

    const embed = buildGiveawayEmbed(record.host_id, record.prize, record.ends_at, record.winner_count, meta, getUniqueParticipants(entries));
    await interaction.message.edit({ embeds: [embed], components: giveawayRows() }).catch(() => {});

    return interaction.reply({ content: `You entered with **${count}** ${count === 1 ? "entry" : "entries"}.`, ephemeral: true });
  }

  if (action === "entries") {
    const people = getUniqueParticipants(entries);
    const text = people.length
      ? people.slice(0, 20).map((e, i) => `${i + 1}. <@${e.userId}> • ${e.count} ${e.count === 1 ? "entry" : "entries"}`).join("\n")
      : "No entries yet.";
    return interaction.reply({ embeds: [new EmbedBuilder().setColor("#60A5FA").setTitle("Giveaway Participants").setDescription(text)], ephemeral: true });
  }
}

function expandEntries(entries) {
  const pool = [];
  for (const entry of entries) {
    const count = Math.max(1, Number(entry.count) || 1);
    for (let i = 0; i < count; i += 1) pool.push(entry.userId);
  }
  return pool;
}

function pickWinners(entries, winnerCount) {
  const pool = expandEntries(entries);
  const winners = new Set();

  while (pool.length && winners.size < winnerCount) {
    const index = Math.floor(Math.random() * pool.length);
    winners.add(pool[index]);
    for (let i = pool.length - 1; i >= 0; i -= 1) {
      if (pool[i] === pool[index]) pool.splice(i, 1);
    }
  }

  return Array.from(winners);
}

async function createGiveawayClaimTicket(guild, winnerId, record) {
  const existing = db.prepare(`
    SELECT * FROM giveaway_claim_tickets
    WHERE giveaway_message_id = ? AND winner_id = ?
  `).get(record.message_id, winnerId);

  if (existing) return existing.ticket_channel_id;

  const settings = getSettings(guild.id);
  const reason = `Claim for giveaway prize: ${record.prize}`;
  const result = await createTicketChannel(guild, await guild.client.users.fetch(winnerId), "giveawayclaim", reason);
  const channelId = result.channelId || result.existingChannelId;
  if (!channelId) return null;

  db.prepare(`
    INSERT OR REPLACE INTO giveaway_claim_tickets (giveaway_message_id, winner_id, ticket_channel_id, created_at)
    VALUES (?, ?, ?, ?)
  `).run(record.message_id, winnerId, channelId, Date.now());

  return channelId;
}

async function postClaimPanelIfNeeded(guild, record, winners) {
  const meta = parseMeta(record);
  if (!meta.claimRequired || !winners.length) return;

  const settings = getSettings(guild.id);
  const claimChannelId = settings.giveawayClaimChannelId || settings.giveawaySystem?.claimChannelId;
  const claimChannel = claimChannelId ? guild.channels.cache.get(claimChannelId) : null;
  if (!claimChannel) return;

  await claimChannel.send({
    embeds: [
      new EmbedBuilder()
        .setColor("#60A5FA")
        .setTitle("Giveaway Claims")
        .setDescription(`Winners for **${record.prize}** may open a claim ticket here.\n\nWinners: ${winners.map((id) => `<@${id}>`).join(", ")}`)
        .setTimestamp()
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`giveaway:claim:${record.message_id}`).setLabel("Open Claim Ticket").setEmoji("🎁").setStyle(ButtonStyle.Primary)
      )
    ]
  }).catch(() => {});
}

async function handleGiveawayClaimButton(interaction, giveawayMessageId) {
  const record = db.prepare("SELECT * FROM giveaways WHERE message_id = ?").get(giveawayMessageId);
  if (!record || !record.ended) {
    return interaction.reply({ content: "This giveaway is not claimable.", ephemeral: true });
  }

  const winnerIds = JSON.parse(record.winner_ids_json || "[]");
  if (!winnerIds.includes(interaction.user.id)) {
    return interaction.reply({ content: "Only winners can open claim tickets for this giveaway.", ephemeral: true });
  }

  const channelId = await createGiveawayClaimTicket(interaction.guild, interaction.user.id, record);
  if (!channelId) return interaction.reply({ content: "Could not create your claim ticket.", ephemeral: true });
  return interaction.reply({ content: `Your claim ticket is ready: <#${channelId}>`, ephemeral: true });
}

async function awardWinnerRoles(guild, winnerIds, record) {
  const meta = parseMeta(record);
  for (const winnerId of winnerIds) {
    const member = await guild.members.fetch(winnerId).catch(() => null);
    if (!member) continue;

    if (meta.grantWinnerRoleId) {
      await member.roles.add(meta.grantWinnerRoleId, "Giveaway winner reward").catch(() => {});
    }

    if (meta.grantPermissionRoleId) {
      await member.roles.add(meta.grantPermissionRoleId, "Giveaway winner custom role reward").catch(() => {});
    }
  }
}

async function endDueGiveaways(client) {
  const now = Date.now();
  const due = db.prepare("SELECT * FROM giveaways WHERE ended = 0 AND ends_at <= ?").all(now);

  for (const record of due) {
    const channel = await client.channels.fetch(record.channel_id).catch(() => null);
    if (!channel) continue;

    const message = await channel.messages.fetch(record.message_id).catch(() => null);
    const entries = parseEntries(record.entry_json);
    const winners = pickWinners(entries, record.winner_count);
    const meta = parseMeta(record);

    db.prepare("UPDATE giveaways SET ended = 1, ended_at = ?, winner_ids_json = ? WHERE message_id = ?")
      .run(Date.now(), JSON.stringify(winners), record.message_id);

    if (message) {
      const endedEmbed = buildGiveawayEmbed(record.host_id, `🎉 ${record.prize}`, record.ends_at, record.winner_count, meta, getUniqueParticipants(entries))
        .setFooter({ text: `Ended • ${getUniqueParticipants(entries).length} participant(s)` });

      await message.edit({ embeds: [endedEmbed], components: [] }).catch(() => {});
    }

    if (winners.length) {
      await awardWinnerRoles(channel.guild, winners, { ...record, metadata_json: JSON.stringify(meta) });
      await channel.send(`🎉 Giveaway ended! Winner(s): ${winners.map((id) => `<@${id}>`).join(", ")} • Prize: **${record.prize}**`).catch(() => {});
      await postClaimPanelIfNeeded(channel.guild, { ...record, metadata_json: JSON.stringify(meta), winner_ids_json: JSON.stringify(winners) }, winners);
    } else {
      await channel.send(`No valid giveaway entries for **${record.prize}**.`).catch(() => {});
    }
  }
}

module.exports = {
  createGiveaway,
  handleGiveawayButton,
  handleGiveawayClaimButton,
  endDueGiveaways,
  pickWinners,
};
