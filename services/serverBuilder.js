const {
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const { roleBlueprint, channelBlueprint } = require("../data/blueprint");
const { setSettings } = require("../database/db");

const roleColors = {
  "👑 King": "#f59e0b",
  "🛡️ Queen": "#ec4899",
  "⚔️ Co-Owner": "#8b5cf6",
  "🧠 Management": "#a855f7",
  "🔨 Administrator": "#ef4444",
  "🛠️ Moderator": "#f97316",
  "🚨 Trial Moderator": "#fb7185",
  "🎫 Support Team": "#22c55e",
  "🤝 Partnership Manager": "#06b6d4",
  "🎉 Event Manager": "#14b8a6",
  "🎨 Designer": "#d946ef",
  "📣 Announcer": "#3b82f6",
  "🪄 Builder Access": "#c084fc",
  "🌟 Booster": "#f472b6",
  "🎖️ VIP": "#eab308",
  "💎 Elite": "#60a5fa",
  "🎁 Giveaway Winner": "#60a5fa",
  "Lv. 100": "#7c3aed",
  "Color • Pink": "#ec4899",
  "Color • Purple": "#8b5cf6",
  "Color • Blue": "#3b82f6",
  "Color • Cyan": "#06b6d4",
  "Color • Green": "#22c55e",
  "Color • Lime": "#84cc16",
  "Color • Yellow": "#eab308",
  "Color • Orange": "#f97316",
  "Color • Red": "#ef4444",
  "Color • White": "#e5e7eb",
  "Color • Black": "#111827"
};

function isSeparator(name) {
  return name.includes("──────────");
}

function permissionSet(logicalName) {
  if (logicalName === "👑 King" || logicalName === "⚔️ Co-Owner") {
    return [PermissionsBitField.Flags.Administrator];
  }

  if (logicalName === "🧠 Management") {
    return [
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.ManageMessages,
      PermissionsBitField.Flags.ManageRoles,
      PermissionsBitField.Flags.ViewAuditLog,
      PermissionsBitField.Flags.ModerateMembers,
      PermissionsBitField.Flags.ManageThreads,
      PermissionsBitField.Flags.MentionEveryone
    ];
  }

  if (logicalName === "🔨 Administrator") {
    return [
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.ManageMessages,
      PermissionsBitField.Flags.ManageThreads,
      PermissionsBitField.Flags.ViewAuditLog,
      PermissionsBitField.Flags.ModerateMembers
    ];
  }

  if (logicalName === "🛠️ Moderator") {
    return [
      PermissionsBitField.Flags.ManageMessages,
      PermissionsBitField.Flags.ModerateMembers,
      PermissionsBitField.Flags.ManageThreads
    ];
  }

  if (logicalName === "🚨 Trial Moderator") {
    return [
      PermissionsBitField.Flags.ManageMessages
    ];
  }

  if (logicalName === "🎫 Support Team") {
    return [
      PermissionsBitField.Flags.ManageMessages,
      PermissionsBitField.Flags.ManageThreads
    ];
  }

  if (logicalName === "🤖 Bots") {
    return [PermissionsBitField.Flags.ViewChannel];
  }

  return [];
}

async function ensureRole(guild, logicalName, displayName) {
  let role = guild.roles.cache.find((r) => r.name === displayName) || guild.roles.cache.find((r) => r.name === logicalName);
  if (role) {
    if (role.name !== displayName) await role.setName(displayName).catch(() => {});
    return role;
  }

  role = await guild.roles.create({
    name: displayName,
    color: roleColors[logicalName] || undefined,
    mentionable: logicalName.startsWith("Ping •"),
    hoist: /King|Queen|Co-Owner|Management|Administrator|Moderator|Support Team|VIP|Elite|Giveaway Winner/.test(logicalName),
    permissions: isSeparator(logicalName) ? [] : permissionSet(logicalName),
    reason: "Aesthetic bot server build",
  });

  return role;
}

async function ensureCategory(guild, displayName) {
  let category = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === displayName
  );
  if (category) return category;
  return guild.channels.create({
    name: displayName,
    type: ChannelType.GuildCategory,
    reason: "Aesthetic bot server build",
  });
}

async function ensureTextChannel(guild, category, displayName, overwrites = []) {
  const existing = guild.channels.cache.find(
    (c) => c.parentId === category.id && c.name === displayName
  );
  if (existing) return existing;
  return guild.channels.create({
    name: displayName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `Managed by aesthetic bot • ${displayName}`,
    permissionOverwrites: overwrites,
    reason: "Aesthetic bot server build",
  });
}

async function ensureVoiceChannel(guild, category, displayName, overwrites = []) {
  const existing = guild.channels.cache.find(
    (c) => c.parentId === category.id && c.name === displayName
  );
  if (existing) return existing;
  return guild.channels.create({
    name: displayName,
    type: ChannelType.GuildVoice,
    parent: category.id,
    permissionOverwrites: overwrites,
    reason: "Aesthetic bot server build",
  });
}

async function buildServer(guild, mode = "safe") {
  const builtRoleIds = {};
  for (const [logicalName, displayName] of Object.entries(roleBlueprint)) {
    const role = await ensureRole(guild, logicalName, displayName);
    builtRoleIds[logicalName] = role.id;
  }

  const everyoneId = guild.roles.everyone.id;
  const staffRoles = [
    builtRoleIds["🛠️ Moderator"],
    builtRoleIds["🚨 Trial Moderator"],
    builtRoleIds["🎫 Support Team"],
    builtRoleIds["🔨 Administrator"],
    builtRoleIds["🧠 Management"],
    builtRoleIds["👑 King"],
    builtRoleIds["⚔️ Co-Owner"]
  ].filter(Boolean);

  const managementRoles = [
    builtRoleIds["🧠 Management"],
    builtRoleIds["🔨 Administrator"],
    builtRoleIds["👑 King"],
    builtRoleIds["⚔️ Co-Owner"]
  ].filter(Boolean);

  const vipRoles = [builtRoleIds["🎖️ VIP"], builtRoleIds["💎 Elite"]].filter(Boolean);
  const boosterRoles = [builtRoleIds["🌟 Booster"]].filter(Boolean);
  const builderRoles = [builtRoleIds["🪄 Builder Access"], builtRoleIds["🧠 Management"], builtRoleIds["👑 King"], builtRoleIds["⚔️ Co-Owner"]].filter(Boolean);
  const giveawayWinnerRoles = [builtRoleIds["🎁 Giveaway Winner"], builtRoleIds["👑 King"], builtRoleIds["⚔️ Co-Owner"]].filter(Boolean);

  const builtChannels = {};
  const voiceKeys = new Set(["General VC", "Chill VC", "Gaming VC", "Music VC", "AFK", "Members: 0", "Bots: 0", "Boosts: 0"]);

  for (const [categoryLogical, def] of Object.entries(channelBlueprint)) {
    const category = await ensureCategory(guild, def.display);
    builtChannels[categoryLogical] = { categoryId: category.id, categoryName: def.display, children: {} };

    for (const [channelLogical, displayName] of Object.entries(def.channels)) {
      let channel;
      const overwrites = [];

      if (["staff-chat", "staff-commands", "mod-logs", "ban-logs", "role-logs", "join-logs", "management-room"].includes(channelLogical)) {
        overwrites.push({ id: everyoneId, deny: [PermissionsBitField.Flags.ViewChannel] });
        for (const rid of staffRoles) overwrites.push({ id: rid, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
      }

      if (["vip-chat", "elite-lounge"].includes(channelLogical)) {
        overwrites.push({ id: everyoneId, deny: [PermissionsBitField.Flags.ViewChannel] });
        for (const rid of vipRoles) overwrites.push({ id: rid, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
      }

      if (["booster-lounge"].includes(channelLogical)) {
        overwrites.push({ id: everyoneId, deny: [PermissionsBitField.Flags.ViewChannel] });
        for (const rid of boosterRoles) overwrites.push({ id: rid, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
      }

      if (["builder-console", "server-build-logs", "templates"].includes(channelLogical)) {
        overwrites.push({ id: everyoneId, deny: [PermissionsBitField.Flags.ViewChannel] });
        for (const rid of builderRoles) overwrites.push({ id: rid, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
      }

      if (["giveaway-claims"].includes(channelLogical)) {
        overwrites.push({ id: everyoneId, deny: [PermissionsBitField.Flags.ViewChannel] });
        for (const rid of staffRoles) overwrites.push({ id: rid, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
        for (const rid of giveawayWinnerRoles) overwrites.push({ id: rid, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
      }

      if (voiceKeys.has(channelLogical)) {
        channel = await ensureVoiceChannel(guild, category, displayName, overwrites);
      } else {
        channel = await ensureTextChannel(guild, category, displayName, overwrites);
      }

      builtChannels[categoryLogical].children[channelLogical] = channel.id;
    }
  }

  const settings = setSettings(guild.id, {
    builtAt: Date.now(),
    buildMode: mode,
    permissionRoleId: builtRoleIds["🪄 Builder Access"],
    customRoleAccessMinLevel: 20,
    levelRewardRoleIds: {
      5: builtRoleIds["Lv. 5"],
      10: builtRoleIds["Lv. 10"],
      20: builtRoleIds["Lv. 20"],
      30: builtRoleIds["Lv. 30"],
      50: builtRoleIds["Lv. 50"],
      75: builtRoleIds["Lv. 75"],
      100: builtRoleIds["Lv. 100"]
    },
    builtRoleIds,
    builtChannels,
    ticketPanelChannelId: builtChannels["🎫 SUPPORT"]?.children?.["open-a-ticket"] || null,
    suggestionsChannelId: builtChannels["💡 COMMUNITY"]?.children?.["suggestions"] || null,
    starboardChannelId: builtChannels["💡 COMMUNITY"]?.children?.["starboard"] || null,
    giveawayChannelId: builtChannels["💡 COMMUNITY"]?.children?.["giveaways"] || null,
    giveawayClaimChannelId: builtChannels["🎫 SUPPORT"]?.children?.["giveaway-claims"] || null,
    announcementChannelId: builtChannels["📌 START HERE"]?.children?.["announcements"] || null,
    modLogChannelId: builtChannels["👑 STAFF"]?.children?.["mod-logs"] || null,
    roleLogChannelId: builtChannels["👑 STAFF"]?.children?.["role-logs"] || null,
    joinLogChannelId: builtChannels["👑 STAFF"]?.children?.["join-logs"] || null,
    transcriptChannelId: builtChannels["🗃️ ARCHIVE"]?.children?.["transcripts"] || null,
    ticketSystem: {
      panel: {
        title: "Ticket Applications",
        description: "Choose the registry that matches your request. Every request is reviewed in due time.",
        accentColor: "#facc15"
      },
      allowUserClose: true,
      claimerRoleIds: [builtRoleIds["🎫 Support Team"], builtRoleIds["🛠️ Moderator"], builtRoleIds["🧠 Management"], builtRoleIds["👑 King"], builtRoleIds["⚔️ Co-Owner"]].filter(Boolean),
      typeConfigs: {
        general: {
          label: "General",
          emoji: "🎫",
          supportRoleIds: [builtRoleIds["🎫 Support Team"]],
          categoryId: builtChannels["🎫 SUPPORT"]?.categoryId || null,
          naming: "general"
        },
        report: {
          label: "Report",
          emoji: "🚨",
          supportRoleIds: [builtRoleIds["🛠️ Moderator"], builtRoleIds["🧠 Management"]],
          categoryId: builtChannels["🎫 SUPPORT"]?.categoryId || null,
          naming: "report"
        },
        appeal: {
          label: "Appeal",
          emoji: "🧷",
          supportRoleIds: [builtRoleIds["🧠 Management"], builtRoleIds["⚔️ Co-Owner"]],
          categoryId: builtChannels["🎫 SUPPORT"]?.categoryId || null,
          naming: "appeal"
        },
        partnership: {
          label: "Partnership",
          emoji: "🤝",
          supportRoleIds: [builtRoleIds["🤝 Partnership Manager"], builtRoleIds["🧠 Management"]],
          categoryId: builtChannels["🎫 SUPPORT"]?.categoryId || null,
          naming: "partner"
        },
        divisionone: {
          label: "Division One",
          emoji: "😀",
          supportRoleIds: [builtRoleIds["🧠 Management"], builtRoleIds["👑 King"], builtRoleIds["⚔️ Co-Owner"]],
          categoryId: builtChannels["🎫 SUPPORT"]?.categoryId || null,
          naming: "division-one"
        },
        divisiontwo: {
          label: "Division Two",
          emoji: "👍",
          supportRoleIds: [builtRoleIds["🧠 Management"], builtRoleIds["👑 King"], builtRoleIds["⚔️ Co-Owner"]],
          categoryId: builtChannels["🎫 SUPPORT"]?.categoryId || null,
          naming: "division-two"
        },
        divisionthree: {
          label: "Division Three",
          emoji: "👑",
          supportRoleIds: [builtRoleIds["🧠 Management"], builtRoleIds["👑 King"], builtRoleIds["⚔️ Co-Owner"]],
          categoryId: builtChannels["🎫 SUPPORT"]?.categoryId || null,
          naming: "division-three"
        },
        giveawayclaim: {
          label: "Giveaway Claim",
          emoji: "🎁",
          supportRoleIds: [builtRoleIds["🎫 Support Team"], builtRoleIds["🧠 Management"]],
          categoryId: builtChannels["🎫 SUPPORT"]?.categoryId || null,
          naming: "claim"
        }
      }
    },
    giveawaySystem: {
      winnerRoleId: builtRoleIds["🎁 Giveaway Winner"] || null,
      claimChannelId: builtChannels["🎫 SUPPORT"]?.children?.["giveaway-claims"] || null
    }
  });

  return settings;
}

module.exports = { buildServer };
