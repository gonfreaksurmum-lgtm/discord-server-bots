# Aesthetic Bot — Next Stage

A much larger Discord.js v14 bot starter built for a full aesthetic/community server.

> **Phase 3 shipped** — see `/updates` in-server for the full release log, or scroll to the bottom of this README.

## Included systems

- Full `/buildserver` blueprint generator from zero
- Creates all bot roles and channels automatically
- Permission-based custom role creation/edit/delete
- Ticket panel with buttons
- Suggestions with voting + staff actions (**now spawns discussion threads**)
- Giveaway creation + reroll foundation
- Polls with buttons
- Starboard (**now with configurable filters — threshold, ignore-bots, channel ignore list, dedup/edit-in-place**)
- Logging system
- Welcome/leave (**now real embeds with invite tracking**)
- Invite tracking
- Member count voice updater
- Level system + level role rewards
- Self-role button panels
- **NEW:** Self-role select-menu panels (`/reactionrole create`)
- **NEW:** Wall of Fame / Shame (`/fame`, `/shame`)
- **NEW:** Sticky messages (`/sticky`)
- **NEW:** Auto-thread channels (`/config autothread`)
- **NEW:** Media-only channels (`/config mediaonly`)
- **NEW:** Auto responders (`/autoresponder`)
- **NEW:** Per-feature toggles & per-channel configs (`/config feature`)
- **NEW:** Owner-differentiated responses — owners see extra debug context
- **NEW:** `/menu` lists every command, `/updates` lists every release
- Setup commands for channels/roles/settings
- Tempban scheduler
- Snipe
- Utility + fun commands
- Railway ready

## Important

Regenerate your bot token if it was ever shared in plain text.

## Install

```bash
npm install
cp .env.example .env
```

Fill in `.env`.

## Deploy slash commands

```bash
npm run deploy
```

## Run locally

```bash
npm run dev
```

## Railway

1. Push this folder to GitHub
2. Import the repo in Railway
3. Add environment variables from `.env.example`
4. Deploy

## First-time setup flow

1. Invite bot with Administrator during setup
2. Run `/buildserver mode: fresh`
3. Run `/setup-bot`
4. Run `/ticketpanel`
5. Run `/selfrole-panel type: colors`
6. Run `/set-log-channel`
7. Run `/set-permission-role`
8. Run `/membercount setup`

## Phase 3 quick start

```
/config welcome channel   channel:#welcome
/config welcome message   title:"Hey {username}!" description:"You're member #{memberCount}"
/config feature toggle    feature:Welcome Messages enabled:true

/sticky set               content:"Read #rules before chatting"
/config autothread add    channel:#discussion
/config mediaonly add     channel:#art allowgifs:true
/config starboard threshold count:5
/config starboard ignorebots enabled:true
/autoresponder add        trigger:"gm" reply:"gm ☀️" match:contains
/reactionrole create      title:"Pick your pronouns" role1:@he/him label1:"He/Him" mode:multi
/fame add                 user:@them reason:"carried us"
```

## Notes

This is intentionally modular. Each phase adds files rather than editing existing ones. Old features still work exactly as they did before — Phase 3 is purely additive.

## Release log

Run `/updates` in-server for the paginated changelog. The source of truth lives in `src/data/changelog.js`.


## New after Phase 3

Run `/features` to toggle features live by phase.
Run `/updates` to browse the changelog.
