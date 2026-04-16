const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
  insertEntry, listEntries, countEntries, deleteEntry, postFame,
} = require("../../services/fame");
const { canManageBot } = require("../../utils/permissions");
const { successEmbed } = require("../../utils/embeds");
const { withOwnerExtras } = require("../../utils/ownerResponse");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fame")
    .setDescription("Wall of Fame — celebrate members")
    .addSubcommand((s) =>
      s.setName("add").setDescription("Add someone to the Wall of Fame")
        .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(true)))
    .addSubcommand((s) =>
      s.setName("list").setDescription("View the Wall of Fame"))
    .addSubcommand((s) =>
      s.setName("remove").setDescription("Remove an entry by ID")
        .addIntegerOption((o) => o.setName("id").setDescription("Entry ID").setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);
      insertEntry({
        guildId: interaction.guild.id, board: "fame",
        userId: user.id, reason, addedBy: interaction.user.id,
      });
      await postFame(interaction.channel, user, reason).catch(() => {});
      return interaction.reply(
        withOwnerExtras(interaction, { embeds: [successEmbed(`Added ${user} to the Wall of Fame.`)], ephemeral: true })
      );
    }

    if (sub === "remove") {
      if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
      const id = interaction.options.getInteger("id", true);
      const res = deleteEntry(id, interaction.guild.id);
      if (!res.changes) throw new Error("No entry with that ID.");
      return interaction.reply(
        withOwnerExtras(interaction, { embeds: [successEmbed(`Removed entry #${id}.`)], ephemeral: true })
      );
    }

    // list
    const total = countEntries(interaction.guild.id, "fame");
    const rows = listEntries(interaction.guild.id, "fame", 15, 0);
    const lines = rows.length
      ? rows.map((r) => `\`#${r.id}\` <@${r.user_id}> — ${r.reason || "no reason"}`)
      : ["No entries yet."];
    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`🌟 Wall of Fame (${total})`)
      .setDescription(lines.join("\n").slice(0, 4000))
      .setTimestamp();
    return interaction.reply(withOwnerExtras(interaction, { embeds: [embed] }));
  },
};
