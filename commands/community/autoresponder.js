const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
  addResponder, removeResponder, toggleResponder, listResponders,
} = require("../../services/autoResponder");
const { canManageBot } = require("../../utils/permissions");
const { successEmbed } = require("../../utils/embeds");
const { withOwnerExtras } = require("../../utils/ownerResponse");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autoresponder")
    .setDescription("Manage keyword auto-responders")
    .addSubcommand((s) =>
      s.setName("add").setDescription("Add a responder")
        .addStringOption((o) => o.setName("trigger").setDescription("Trigger text / regex").setRequired(true))
        .addStringOption((o) => o.setName("reply").setDescription("Bot reply").setRequired(true))
        .addStringOption((o) => o.setName("match").setDescription("Match type").setRequired(false)
          .addChoices(
            { name: "contains", value: "contains" },
            { name: "exact", value: "exact" },
            { name: "startsWith", value: "startsWith" },
            { name: "regex", value: "regex" }
          ))
        .addBooleanOption((o) => o.setName("casesensitive").setDescription("Case sensitive?").setRequired(false)))
    .addSubcommand((s) =>
      s.setName("remove").setDescription("Remove a responder by ID")
        .addIntegerOption((o) => o.setName("id").setDescription("Responder ID").setRequired(true)))
    .addSubcommand((s) =>
      s.setName("toggle").setDescription("Enable/disable a responder")
        .addIntegerOption((o) => o.setName("id").setDescription("Responder ID").setRequired(true))
        .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)))
    .addSubcommand((s) =>
      s.setName("list").setDescription("List all responders")),

  async execute(interaction) {
    if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const id = addResponder({
        guildId: interaction.guild.id,
        trigger: interaction.options.getString("trigger", true),
        reply: interaction.options.getString("reply", true),
        matchType: interaction.options.getString("match") || "contains",
        caseSensitive: interaction.options.getBoolean("casesensitive") || false,
        createdBy: interaction.user.id,
      });
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed(`Added responder \`#${id}\`.`)], ephemeral: true },
        { extras: { ID: id } }
      ));
    }

    if (sub === "remove") {
      const id = interaction.options.getInteger("id", true);
      const res = removeResponder(id, interaction.guild.id);
      if (!res.changes) throw new Error("No responder with that ID.");
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed(`Removed responder #${id}.`)], ephemeral: true }
      ));
    }

    if (sub === "toggle") {
      const id = interaction.options.getInteger("id", true);
      const enabled = interaction.options.getBoolean("enabled", true);
      const res = toggleResponder(id, interaction.guild.id, enabled);
      if (!res.changes) throw new Error("No responder with that ID.");
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed(`Responder #${id} is now ${enabled ? "enabled" : "disabled"}.`)], ephemeral: true }
      ));
    }

    // list
    const rows = listResponders(interaction.guild.id);
    const lines = rows.length
      ? rows.map((r) =>
          `\`#${r.id}\` ${r.enabled ? "🟢" : "⚪"} [${r.match_type}${r.case_sensitive ? ",cs" : ""}] ` +
          `**${r.trigger.slice(0, 40)}** → ${r.reply.slice(0, 80)}`
        )
      : ["No responders configured."];
    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`Auto Responders (${rows.length})`)
      .setDescription(lines.join("\n").slice(0, 4000))
      .setTimestamp();
    return interaction.reply(withOwnerExtras(interaction, { embeds: [embed], ephemeral: true }));
  },
};
