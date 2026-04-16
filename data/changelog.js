module.exports = [
  {
    "version": "10.2.0",
    "date": "2026-04-16",
    "title": "Phase 10.2 — Stability, Ticket Suite, Giveaway Claim Flow, and Builder Styling",
    "phase": 10,
    "highlights": [
      "Ticket system gained reason modals, per-type routing, claimer roles, ticket claiming, transcript export on delete, and panel customization",
      "Giveaways now support role requirements, bypass roles, blacklist roles, bonus entries, winner role rewards, and optional custom-role access rewards",
      "Giveaway winners can open dedicated claim tickets from a hidden giveaway-claims channel",
      "Server builder now creates styled categories, channels, and roles while keeping logical IDs compatible with the existing codebase",
      "Role permissions were tightened so only King and Co-Owner receive Administrator while the rest avoid kick/ban permissions by default"
    ],
    "notes": [
      "Discord chooses the client font, so the builder now uses decorative Unicode styling rather than trying to force a font the client cannot control."
    ]
  },
  {
    "version": "10.1.0",
    "date": "2026-04-16",
    "title": "Phase 10.1 \u2014 Stability, Automation, and Owner Workflow Upgrade",
    "phase": 10,
    "highlights": [
      "Owner quick panel now responds with a richer custom dashboard and shortcuts",
      "Automation gained reminder lists, reminder deletion, birthday lists, schedule lists, and custom-command lists",
      "Economy gained deposit, withdraw, and leaderboard support",
      "Safety gained moderation case viewing and cleaner timeout expiry tracking",
      "Premium analytics now include achievements, reminders, applications, and voice leaderboards"
    ],
    "notes": [
      "This release focuses on improving and advancing existing systems instead of replacing them."
    ]
  },
  {
    "version": "10.0.0",
    "date": "2026-04-16",
    "title": "Phase 10 \u2014 Analytics, Voice Tracking, Join-to-Create",
    "phase": 10,
    "highlights": [
      "Voice activity tracking with /premium voicestats",
      "Guild analytics with /premium analytics",
      "Join-to-create voice setup with auto room cleanup",
      "Achievements now surface in profiles and /premium achievements"
    ],
    "notes": [
      "Built as additive extensions to the existing Phase 3 foundation."
    ]
  },
  {
    "version": "9.0.0",
    "date": "2026-04-16",
    "title": "Phase 9 \u2014 Backups, Applications, Invite Rewards",
    "phase": 9,
    "highlights": [
      "Guild backup export via /infrastructure backup",
      "Simple application intake via /infrastructure apply",
      "Invite reward mapping via /infrastructure invite-reward",
      "Transcript and backup toggles added to the live features dashboard"
    ],
    "notes": [
      "Backup export is JSON-based and designed to be safe to inspect and version."
    ]
  },
  {
    "version": "8.0.0",
    "date": "2026-04-16",
    "title": "Phase 8 \u2014 Reminders, Birthdays, Scheduled Announcements",
    "phase": 8,
    "highlights": [
      "Reminders with /automation remind",
      "Birthday storage with /automation birthday",
      "Scheduled announcements with /automation schedule",
      "Automation processing loop added to the runtime"
    ],
    "notes": [
      "Scheduled systems are intentionally lightweight so they run well on Railway."
    ]
  },
  {
    "version": "7.0.0",
    "date": "2026-04-16",
    "title": "Phase 7 \u2014 Custom Commands and Server Customization",
    "phase": 7,
    "highlights": [
      "Custom text commands with /automation customcommand-add",
      "Feature registry expanded for phase 7 toggles",
      "Menu categories updated to show all new command sections"
    ],
    "notes": [
      "Channel templates were added at the schema level for later safe expansion."
    ]
  },
  {
    "version": "6.0.0",
    "date": "2026-04-16",
    "title": "Phase 6 \u2014 Economy and Role Shop",
    "phase": 6,
    "highlights": [
      "Wallets, daily, work, transfers, shop, buy, and inventory",
      "Role shop items with automatic role granting",
      "Economy integrates with profiles for richer user cards"
    ],
    "notes": [
      "Economy remains intentionally simple and easy to audit."
    ]
  },
  {
    "version": "5.0.0",
    "date": "2026-04-16",
    "title": "Phase 5 \u2014 Social Systems",
    "phase": 5,
    "highlights": [
      "Profiles, reputation, AFK, marriage, and social daily",
      "AFK is now cleared automatically when the user talks again",
      "Profiles now surface level, rep, economy, and achievements"
    ],
    "notes": [
      "All additions are database-backed and additive to prior phases."
    ]
  },
  {
    "version": "4.0.0",
    "date": "2026-04-16",
    "title": "Phase 4 \u2014 Safety, Verification, and Case Logging",
    "phase": 4,
    "highlights": [
      "Warnings, timeout scheduling, verification panel, and autorole",
      "Message edit, channel, role, and voice logging added",
      "Anti-spam and anti-link automod now actively inspect messages",
      "Live /features dashboard now toggles features through menus"
    ],
    "notes": [
      "Phase 4 also includes fixes and upgrades to partially completed safety systems."
    ]
  },
  {
    "version": "3.0.0",
    "date": "2026-04-16",
    "title": "Phase 3 \u2014 Core Community Systems",
    "phase": 3,
    "highlights": [
      "Welcome & leave embeds with invite tracking display",
      "Wall of Fame & Wall of Shame (/fame, /shame) with persistence",
      "Suggestion threads \u2014 every suggestion now spawns a discussion thread",
      "Starboard filters \u2014 min stars, ignore bots, ignored channels, duplicate guard",
      "Auto-thread for active channels (/config autothread add)",
      "Sticky messages (/sticky set|clear) that re-post after chatter",
      "Media-only channels (/config mediaonly add)",
      "Reaction role select-menu panels (/reactionrole create)",
      "Auto responder \u2014 keyword \u2192 reply, with match modes",
      "Per-channel configs & per-feature toggles (/config)",
      "Owner-differentiated responses (owners see extra debug info)",
      "/updates command lists every release",
      "/menu command lists every available command"
    ],
    "notes": [
      "Nothing from prior versions changed \u2014 only additive improvements.",
      "Existing starboard still works exactly the same; filters are opt-in."
    ]
  },
  {
    "version": "2.0.0",
    "date": "2026-04-16",
    "title": "Baseline \u2014 Aesthetic Bot Next Stage",
    "phase": 2,
    "highlights": [
      "Server builder (/buildserver) with category blueprint",
      "Custom roles, self-role panels (buttons), tickets, suggestions",
      "Giveaways with timers, leveling, logging, tempbans",
      "Moderation basics (warn/kick/ban/timeout), snipe, automod stub",
      "Member count channel, invite cache, setup commands"
    ],
    "notes": [
      "This is the foundation all later phases build on top of."
    ]
  }
];
