const { db, getSettings } = require("../database/db");
const { roleBlueprint } = require("../data/blueprint");

function getUserLevel(guildId, userId) {
  return db
    .prepare("SELECT level FROM user_levels WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId)?.level || 0;
}

function getCustomRoleRecord(guildId, ownerId) {
  return db
    .prepare("SELECT * FROM custom_roles WHERE guild_id = ? AND owner_id = ?")
    .get(guildId, ownerId);
}

async function assertCanUseCustomRoles(member) {
  const settings = getSettings(member.guild.id);
  const level = getUserLevel(member.guild.id, member.id);
  const hasPermissionRole = settings.permissionRoleId
    ? member.roles.cache.has(settings.permissionRoleId)
    : false;

  if (!hasPermissionRole && level < (settings.customRoleAccessMinLevel || 20)) {
    throw new Error(
      `You need the configured permission role or level ${settings.customRoleAccessMinLevel || 20}+ to use custom roles.`
    );
  }
}

function findAnchorRole(guild) {
  const preferred = roleBlueprint["🎭 Custom Role Holders"];
  const fallback = roleBlueprint["Lv. 20"];
  return guild.roles.cache.find((r) => r.name === preferred)
    || guild.roles.cache.find((r) => r.name === fallback)
    || null;
}

async function createCustomRole(member, name, color) {
  await assertCanUseCustomRoles(member);

  const existing = getCustomRoleRecord(member.guild.id, member.id);
  if (existing) throw new Error("You already own a custom role. Use edit or delete.");

  const anchorRole = findAnchorRole(member.guild);

  const role = await member.guild.roles.create({
    name,
    color,
    permissions: [],
    mentionable: false,
    hoist: true,
    reason: `Custom role created by ${member.user.tag}`,
  });

  if (anchorRole && role.position < anchorRole.position) {
    try {
      await role.setPosition(anchorRole.position, "Place custom role near anchor");
    } catch {}
  }

  await member.roles.add(role, "Assigned owned custom role");

  db.prepare(`
    INSERT INTO custom_roles (guild_id, owner_id, role_id, name, color)
    VALUES (?, ?, ?, ?, ?)
  `).run(member.guild.id, member.id, role.id, name, color);

  return role;
}

async function editCustomRole(member, updates) {
  await assertCanUseCustomRoles(member);

  const record = getCustomRoleRecord(member.guild.id, member.id);
  if (!record) throw new Error("You do not own a custom role yet.");

  const role = member.guild.roles.cache.get(record.role_id);
  if (!role) throw new Error("Your custom role no longer exists.");

  if (updates.name) await role.setName(updates.name, "Custom role edit");
  if (updates.color) await role.setColor(updates.color, "Custom role edit");

  db.prepare(`
    UPDATE custom_roles
    SET name = ?, color = ?
    WHERE guild_id = ? AND owner_id = ?
  `).run(updates.name || role.name, updates.color || role.hexColor, member.guild.id, member.id);

  return role;
}

async function deleteCustomRole(member) {
  await assertCanUseCustomRoles(member);

  const record = getCustomRoleRecord(member.guild.id, member.id);
  if (!record) throw new Error("You do not own a custom role.");

  const role = member.guild.roles.cache.get(record.role_id);
  if (role) {
    try {
      await role.delete("Custom role deleted by owner");
    } catch {}
  }

  db.prepare("DELETE FROM custom_roles WHERE guild_id = ? AND owner_id = ?")
    .run(member.guild.id, member.id);
}

module.exports = {
  createCustomRole,
  editCustomRole,
  deleteCustomRole,
  getCustomRoleRecord,
  assertCanUseCustomRoles,
};
