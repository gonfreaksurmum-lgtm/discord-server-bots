const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { createGiveaway, pickWinners } = require("../../services/giveaways");
const { getSettings, db } = require("../../database/db");
const { parseDuration } = require("../../utils/duration");
const { canManageBot } = require("../../utils/permissions");
const { successEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Create or reroll a giveaway.")
    .addSubcommand((s) =>
      s.setName("start")
        .setDescription("Start a giveaway")
        .addStringOption((o) => o.setName("duration").setDescription("Example: 1d, 12h, 30m").setRequired(true))
        .addStringOption((o) => o.setName("prize").setDescription("Prize name").setRequired(true))
        .addIntegerOption((o) => o.setName("winners").setDescription("Winner count").setRequired(false))
        .addChannelOption((o) => o.setName("channel").setDescription("Target channel").addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addStringOption((o) => o.setName("description").setDescription("Short giveaway description").setRequired(false))
        .addRoleOption((o) => o.setName("required_role").setDescription("Role required to enter").setRequired(false))
        .addRoleOption((o) => o.setName("bypass_role").setDescription("Role that bypasses requirements").setRequired(false))
        .addRoleOption((o) => o.setName("blacklist_role").setDescription("Role blocked from entering").setRequired(false))
        .addRoleOption((o) => o.setName("bonus_role").setDescription("Role that gets extra entries").setRequired(false))
        .addIntegerOption((o) => o.setName("bonus_entries").setDescription("Extra entries for bonus role").setRequired(false))
        .addRoleOption((o) => o.setName("grant_role").setDescription("Role given to winners").setRequired(false))
        .addBooleanOption((o) => o.setName("grant_customrole_perm").setDescription("Also grant the configured permission role").setRequired(false))
        .addBooleanOption((o) => o.setName("claim_required").setDescription("Require winners to open a claim ticket").setRequired(false))
    )
    .addSubcommand((s) =>
      s.setName("reroll")
        .setDescription("Reroll an ended giveaway")
        .addStringOption((o) => o.setName("message_id").setDescription("Giveaway message id").setRequired(true))
    ),

  async execute(interaction) {
    if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
    const sub = interaction.options.getSubcommand();

    if (sub === "start") {
      const durationText = interaction.options.getString("duration", true);
      const duration = parseDuration(durationText);
      if (!duration) throw new Error("Invalid duration.");

      const prize = interaction.options.getString("prize", true);
      const winners = interaction.options.getInteger("winners") || 1;
      const settings = getSettings(interaction.guild.id);
      const channel =
        interaction.options.getChannel("channel") ||
        interaction.guild.channels.cache.get(settings.giveawayChannelId) ||
        interaction.channel;

      const requiredRole = interaction.options.getRole("required_role");
      const bypassRole = interaction.options.getRole("bypass_role");
      const blacklistRole = interaction.options.getRole("blacklist_role");
      const bonusRole = interaction.options.getRole("bonus_role");
      const grantRole = interaction.options.getRole("grant_role");
      const grantCustomPerm = interaction.options.getBoolean("grant_customrole_perm") || false;
      const claimRequired = interaction.options.getBoolean("claim_required") || false;

      const meta = {
        description: interaction.options.getString("description") || "Click 🎉 button to enter!",
        requiredRoleId: requiredRole?.id || null,
        requirementText: requiredRole ? `Role: ${requiredRole.name}` : null,
        bypassRoleId: bypassRole?.id || null,
        blacklistRoleId: blacklistRole?.id || null,
        bonusRoleId: bonusRole?.id || null,
        bonusEntries: interaction.options.getInteger("bonus_entries") || 0,
        grantWinnerRoleId: grantRole?.id || settings.giveawaySystem?.winnerRoleId || null,
        grantPermissionRoleId: grantCustomPerm ? (settings.permissionRoleId || null) : null,
        claimRequired
      };

      await createGiveaway(channel, interaction.user.id, duration, prize, winners, meta);
      return interaction.reply({ embeds: [successEmbed(`Giveaway started in ${channel}.`)], ephemeral: true });
    }

    if (sub === "reroll") {
      const messageId = interaction.options.getString("message_id", true);
      const record = db.prepare("SELECT * FROM giveaways WHERE message_id = ?").get(messageId);
      if (!record) throw new Error("Giveaway not found.");
      const entries = JSON.parse(record.entry_json || "[]");
      const winners = pickWinners(entries, record.winner_count);
      return interaction.reply({
        embeds: [successEmbed(winners.length ? `Reroll winner(s): ${winners.map((id) => `<@${id}>`).join(", ")}` : "No entries to reroll.")],
        ephemeral: false
      });
    }
  },
};
