# PHASE 3 — Core Community Systems

Status: **Shipped**. All features are additive — no existing file behavior was altered.

## What's new

### Foundation layer (needed by every future phase)
- `src/database/migrations.js` — additive schema (never ALTERs existing tables)
- `src/services/featureToggles.js` — per-feature, per-channel config registry
- `src/utils/ownerResponse.js` — wraps interaction replies with owner-only debug embed
- `src/data/changelog.js` — version-controlled release log (feeds `/updates`)
- `src/commands/foundation/updates.js` — `/updates` paginated changelog viewer
- `src/commands/foundation/menu.js` — `/menu` lists every command
- `src/components/buttons/updates_{next,prev,latest}.js` — changelog nav buttons
- `src/components/selectMenus/menu_category.js` — menu category dropdown

### Phase 3 features

| Feature                      | Files                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| Welcome embeds + invite info | `services/welcome.js` (rewritten, same exports), wired into existing `guildMemberAdd` |
| Leave embeds                 | same as above, wired into `guildMemberRemove`                                          |
| Wall of Fame / Shame         | `services/fame.js`, `commands/community/fame.js`, `commands/community/shame.js`        |
| Suggestion threads           | appended to `services/suggestions.js` (existing logic untouched)                        |
| Starboard filters            | `services/starboard.js` (rewritten, legacy behavior preserved when unset)              |
| Sticky messages              | `services/sticky.js`, `commands/community/sticky.js`                                    |
| Auto-thread                  | `services/autoThread.js`, managed via `/config autothread ...`                         |
| Media-only channels          | `services/mediaOnly.js`, managed via `/config mediaonly ...`                           |
| Reaction-role select panel   | `services/reactionRoles.js`, `commands/roles/reactionrole.js`, `components/selectMenus/reactionrole.js` |
| Auto responder               | `services/autoResponder.js`, `commands/community/autoresponder.js`                     |
| Per-feature / per-channel    | `services/featureToggles.js`, `commands/config/config.js`                               |

### Wiring (minimally-invasive edits)
- `src/index.js` — calls `runMigrations()` on boot
- `src/events/messageCreate.js` — delegates to sticky / autoThread / mediaOnly / autoResponder after existing XP call
- `src/events/guildMemberAdd.js` — calls `sendWelcome` after existing log
- `src/events/guildMemberRemove.js` — calls `sendLeave` after existing log
- `src/services/suggestions.js` — starts a thread after the existing send+insert

## Unchanged — explicitly verified
- All pre-existing commands
- All pre-existing services (`tickets`, `customroles`, `giveaways`, `levels`, `invites`, `memberCount`, `logging`, `tempbans`, `automod`, `buildProfiles`, `serverBuilder`, `transcripts`, `selfroles`)
- All database tables that existed before Phase 3

## How to use
- Open `/menu` for a live catalog
- Open `/updates` for the release log
- Open `/config feature list` to see every toggleable feature
