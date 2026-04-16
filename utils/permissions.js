const { PermissionFlagsBits } = require("discord.js");
const { getSettings } = require("../database/db");
const config = require("../config");

function isOwner(userId) {
  return config.ownerIds.includes(userId);
}

function hasPermissionRole(member) {
  const settings = getSettings(member.guild.id);
  const permissionRoleId = settings.permissionRoleId;
  if (!permissionRoleId) return false;
  return member.roles.cache.has(permissionRoleId);
}

function canManageBot(member) {
  return (
    isOwner(member.id) ||
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    hasPermissionRole(member)
  );
}

module.exports = { isOwner, hasPermissionRole, canManageBot };
