// ============================================================================
// WELCOME & LEAVE
// ----------------------------------------------------------------------------
// Backward compatible: still exports sendWelcome(member) and sendLeave(member)
// so guildMemberAdd / guildMemberRemove keep working. Now actually produces
// embeds when a welcome channel is configured AND the feature is enabled.
// ============================================================================

const { EmbedBuilder } = require("discord.js");
const { getSettings, db } = require("../database/db");
const { isEnabled } = require("./featureToggles");
const { resolveUsedInvite } = require("./invites");
const config = require("../config");

function renderTemplate(template, ctx) {
  if (!template) return null;
  return template
    .replace(/\{user\}/g,        ctx.user)
    .replace(/\{username\}/g,    ctx.username)
    .replace(/\{mention\}/g,     ctx.mention)
    .replace(/\{server\}/g,      ctx.server)
    .replace(/\{memberCount\}/g, ctx.memberCount)
    .replace(/\{inviter\}/g,     ctx.inviter || "unknown")
    .replace(/\{inviteCode\}/g,  ctx.inviteCode || "unknown")
    .replace(/\{inviteCount\}/g, ctx.inviteCount ?? "?");
}

function totalInvitesFromCache(guildId, inviterId) {
  if (!inviterId) return null;
  const row = db
    .prepare("SELECT COALESCE(SUM(uses),0) AS total FROM invite_cache WHERE guild_id = ? AND inviter_id = ?")
    .get(guildId, inviterId);
  return row?.total ?? null;
}

async function sendWelcome(member) {
  if (!member?.guild) return null;
  if (!isEnabled(member.guild.id, "welcomeMessages")) return null;

  const settings = getSettings(member.guild.id);
  const channelId = settings.welcomeChannelId;
  if (!channelId) return null;
  const channel = member.guild.channels.cache.get(channelId);
  if (!channel) return null;

  const invite = await resolveUsedInvite(member.guild).catch(() => null);
  const inviterId = invite?.inviter?.id;
  const inviteCount = inviterId ? totalInvitesFromCache(member.guild.id, inviterId) : null;

  const ctx = {
    user: member.user.tag,
    username: member.user.username,
    mention: `<@${member.id}>`,
    server: member.guild.name,
    memberCount: member.guild.memberCount,
    inviter: inviterId ? `<@${inviterId}>` : null,
    inviteCode: invite?.code,
    inviteCount,
  };

  const title =
    renderTemplate(settings.welcomeTitle, ctx) || `Welcome to ${ctx.server}!`;
  const description =
    renderTemplate(settings.welcomeMessage, ctx) ||
    `Hey ${ctx.mention}, glad to have you here. You're member **#${ctx.memberCount}**.`;

  const embed = new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(title)
    .setDescription(description)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp();

  if (ctx.inviter) {
    embed.addFields({
      name: "Invited by",
      value: `${ctx.inviter} (\`${ctx.inviteCode}\`)${inviteCount != null ? ` • ${inviteCount} total invites` : ""}`,
    });
  } else {
    embed.addFields({ name: "Invite source", value: "Unknown (vanity URL, direct add, or audit hidden)" });
  }

  return channel.send({ content: `${ctx.mention}`, embeds: [embed] }).catch(() => null);
}

async function sendLeave(member) {
  if (!member?.guild) return null;
  if (!isEnabled(member.guild.id, "leaveMessages")) return null;

  const settings = getSettings(member.guild.id);
  const channelId = settings.leaveChannelId;
  if (!channelId) return null;
  const channel = member.guild.channels.cache.get(channelId);
  if (!channel) return null;

  const ctx = {
    user: member.user?.tag || "unknown",
    username: member.user?.username || "unknown",
    mention: `<@${member.id}>`,
    server: member.guild.name,
    memberCount: member.guild.memberCount,
  };

  const title =
    renderTemplate(settings.leaveTitle, ctx) || `Goodbye`;
  const description =
    renderTemplate(settings.leaveMessage, ctx) ||
    `**${ctx.user}** just left. The server now has **${ctx.memberCount}** members.`;

  const embed = new EmbedBuilder()
    .setColor("#6B7280")
    .setTitle(title)
    .setDescription(description)
    .setThumbnail(member.user?.displayAvatarURL({ size: 256 }) || null)
    .setTimestamp();

  return channel.send({ embeds: [embed] }).catch(() => null);
}

module.exports = { sendWelcome, sendLeave, renderTemplate };
