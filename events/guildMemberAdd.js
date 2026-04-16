const { resolveUsedInvite } = require("../services/invites");
const { sendLog } = require("../services/logging");
const { updateMemberCounter } = require("../services/memberCount");
const welcome = require("../services/welcome");
const { handleJoin } = require("../services/moderationPlus");
const { listInviteRewards } = require("../services/infrastructure");
const { db } = require("../database/db");
const { isEnabled } = require("../services/featureToggles");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    const invite = await resolveUsedInvite(member.guild).catch(() => null);
    const inviteText = invite ? `Invited by <@${invite.inviter?.id}> via \`${invite.code}\`` : "Invite unknown";
    await sendLog(member.guild, "joinLogChannelId", "Member Joined", `${member.user} joined.\n${inviteText}`);
    await updateMemberCounter(member.guild);
    await handleJoin(member).catch(() => {});
    await welcome.sendWelcome(member, invite).catch(() => {});

    if (isEnabled(member.guild.id, "inviteRewards") && invite?.inviter?.id) {
      const inviterId = invite.inviter.id;
      const since = db.prepare("SELECT COUNT(*) c FROM invite_cache WHERE guild_id = ? AND inviter_id = ?").get(member.guild.id, inviterId)?.c || 0;
      for (const reward of listInviteRewards(member.guild.id)) {
        if (since >= reward.invite_count) {
          const inviterMember = await member.guild.members.fetch(inviterId).catch(() => null);
          const role = member.guild.roles.cache.get(reward.role_id);
          if (inviterMember && role) await inviterMember.roles.add(role, "Invite reward").catch(() => {});
        }
      }
    }
  },
};
