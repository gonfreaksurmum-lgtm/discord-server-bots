// ============================================================================
// AUTO RESPONDER
// ----------------------------------------------------------------------------
// Match modes: exact | contains | startsWith | regex.
// Multiple responders can match — the first enabled match in insertion order
// wins. Failures during regex compile are silent.
// ============================================================================

const { db } = require("../database/db");
const { isEnabled } = require("./featureToggles");

function addResponder({ guildId, trigger, reply, matchType, caseSensitive, createdBy }) {
  const info = db.prepare(`
    INSERT INTO auto_responders
      (guild_id, trigger, reply, match_type, case_sensitive, enabled, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    guildId, trigger, reply,
    matchType || "contains",
    caseSensitive ? 1 : 0,
    createdBy,
    Date.now()
  );
  return info.lastInsertRowid;
}

function removeResponder(id, guildId) {
  return db.prepare("DELETE FROM auto_responders WHERE id = ? AND guild_id = ?").run(id, guildId);
}

function toggleResponder(id, guildId, enabled) {
  return db
    .prepare("UPDATE auto_responders SET enabled = ? WHERE id = ? AND guild_id = ?")
    .run(enabled ? 1 : 0, id, guildId);
}

function listResponders(guildId) {
  return db
    .prepare("SELECT * FROM auto_responders WHERE guild_id = ? ORDER BY id ASC")
    .all(guildId);
}

function matches(responder, content) {
  const raw = responder.case_sensitive ? content : content.toLowerCase();
  const trig = responder.case_sensitive ? responder.trigger : responder.trigger.toLowerCase();

  switch (responder.match_type) {
    case "exact":      return raw === trig;
    case "startsWith": return raw.startsWith(trig);
    case "regex":
      try {
        const re = new RegExp(responder.trigger, responder.case_sensitive ? "" : "i");
        return re.test(content);
      } catch { return false; }
    case "contains":
    default:           return raw.includes(trig);
  }
}

async function handleMessage(message) {
  if (!message.guild || message.author.bot) return;
  if (!isEnabled(message.guild.id, "autoResponder")) return;

  const responders = listResponders(message.guild.id).filter((r) => r.enabled);
  if (!responders.length) return;

  const hit = responders.find((r) => matches(r, message.content || ""));
  if (!hit) return;

  await message.reply({ content: hit.reply, allowedMentions: { parse: [] } }).catch(() => {});
}

module.exports = {
  addResponder,
  removeResponder,
  toggleResponder,
  listResponders,
  handleMessage,
  matches,
};
