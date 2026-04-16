const { db } = require("../database/db");

const FEATURES = {
  welcomeMessages:       { phase: 3, label: "Welcome Messages",            defaultOn: true  },
  leaveMessages:         { phase: 3, label: "Leave Messages",              defaultOn: true  },
  wallOfFame:            { phase: 3, label: "Wall of Fame / Shame",        defaultOn: true  },
  suggestionThreads:     { phase: 3, label: "Suggestion Threads",          defaultOn: true  },
  starboardFilters:      { phase: 3, label: "Starboard Filters",           defaultOn: true  },
  autoThread:            { phase: 3, label: "Auto Thread",                 defaultOn: false },
  stickyMessages:        { phase: 3, label: "Sticky Messages",             defaultOn: true  },
  mediaOnlyChannels:     { phase: 3, label: "Media Only Channels",         defaultOn: true  },
  reactionRoleSelect:    { phase: 3, label: "Reaction Role Select",        defaultOn: true  },
  autoResponder:         { phase: 3, label: "Auto Responder",              defaultOn: true  },

  warningSystem:         { phase: 4, label: "Warning System",              defaultOn: true  },
  antiSpam:              { phase: 4, label: "Anti Spam",                   defaultOn: true  },
  antiLink:              { phase: 4, label: "Anti Link",                   defaultOn: false },
  lockdown:              { phase: 4, label: "Lockdown Mode",               defaultOn: false },
  autoRole:              { phase: 4, label: "Auto Role",                   defaultOn: true  },
  verification:          { phase: 4, label: "Verification",                defaultOn: false },

  profiles:              { phase: 5, label: "Profiles",                    defaultOn: true  },
  reputation:            { phase: 5, label: "Reputation",                  defaultOn: true  },
  afk:                   { phase: 5, label: "AFK",                         defaultOn: true  },
  socialDaily:           { phase: 5, label: "Daily Rewards",               defaultOn: true  },

  economy:               { phase: 6, label: "Economy",                     defaultOn: true  },
  roleShop:              { phase: 6, label: "Role Shop",                   defaultOn: true  },

  customCommands:        { phase: 7, label: "Custom Commands",             defaultOn: true  },
  channelTemplates:      { phase: 7, label: "Channel Templates",           defaultOn: true  },

  reminders:             { phase: 8, label: "Reminders",                   defaultOn: true  },
  birthdays:             { phase: 8, label: "Birthdays",                   defaultOn: true  },
  scheduledAnnouncements:{ phase: 8, label: "Scheduled Announcements",     defaultOn: true  },

  applications:          { phase: 9, label: "Applications",                defaultOn: true  },
  inviteRewards:         { phase: 9, label: "Invite Rewards",              defaultOn: false },
  transcripts:           { phase: 9, label: "Transcripts",                 defaultOn: true  },
  backups:               { phase: 9, label: "Backups",                     defaultOn: true  },

  achievements:          { phase: 10,label: "Achievements",                defaultOn: true  },
  voiceTracking:         { phase: 10,label: "Voice Tracking",              defaultOn: true  },
  joinToCreate:          { phase: 10,label: "Join To Create VC",           defaultOn: false },
  analytics:             { phase: 10,label: "Analytics",                   defaultOn: true  },
};

function isFeature(feature) {
  return Object.prototype.hasOwnProperty.call(FEATURES, feature);
}

function isEnabled(guildId, feature) {
  if (!isFeature(feature)) return false;
  const row = db.prepare("SELECT enabled FROM feature_toggles WHERE guild_id = ? AND feature = ?").get(guildId, feature);
  if (!row) return FEATURES[feature].defaultOn;
  return row.enabled === 1;
}

function setEnabled(guildId, feature, enabled) {
  if (!isFeature(feature)) throw new Error(`Unknown feature: ${feature}`);
  db.prepare(`
    INSERT INTO feature_toggles (guild_id, feature, enabled, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, feature) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at
  `).run(guildId, feature, enabled ? 1 : 0, Date.now());
  return isEnabled(guildId, feature);
}

function toggleEnabled(guildId, feature) {
  return setEnabled(guildId, feature, !isEnabled(guildId, feature));
}

function listFeatures(guildId, phase = null) {
  return Object.entries(FEATURES)
    .filter(([, meta]) => phase == null || meta.phase === Number(phase))
    .map(([key, meta]) => ({
      key,
      phase: meta.phase,
      label: meta.label,
      enabled: isEnabled(guildId, key),
      defaultOn: meta.defaultOn,
    }))
    .sort((a, b) => a.phase - b.phase || a.label.localeCompare(b.label));
}

function setPhaseEnabled(guildId, phase, enabled) {
  const items = Object.entries(FEATURES).filter(([, meta]) => meta.phase === Number(phase));
  for (const [feature] of items) setEnabled(guildId, feature, enabled);
  return items.length;
}

function getFeatureCounts(guildId) {
  const all = listFeatures(guildId);
  return {
    total: all.length,
    enabled: all.filter((f) => f.enabled).length,
    disabled: all.filter((f) => !f.enabled).length,
    byPhase: [...new Set(all.map((f) => f.phase))].map((phase) => {
      const rows = all.filter((f) => f.phase === phase);
      return {
        phase,
        enabled: rows.filter((f) => f.enabled).length,
        total: rows.length,
      };
    }),
  };
}

module.exports = {
  FEATURES,
  isFeature,
  isEnabled,
  setEnabled,
  toggleEnabled,
  listFeatures,
  setPhaseEnabled,
  getFeatureCounts,
};
