const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { setSticky, clearSticky, getSticky, buildStickyEmbed } = require("../../services/sticky");
const { canManageBot } = require("../../utils/permissions");
const { successEmbed } = require("../../utils/embeds");
const { withOwnerExtras } = require("../../utils/ownerResponse");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sticky")
    .setDescription("Sticky messages for the current channel")
    .addSubcommand((s) =>
      s.setName("set").setDescription("Set a sticky message for this channel")
        .addStringOption((o) => o.setName("content").setDescription("Sticky content").setRequired(true)))
    .addSubcommand((s) =>
      s.setName("clear").setDescription("Remove the sticky from this channel"))
    .addSubcommand((s) =>
      s.setName("view").setDescription("Preview the current sticky")),

  async execute(interaction) {
    if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const content = interaction.options.getString("content", true);
      setSticky(interaction.channel.id, interaction.guild.id, content);
      // Post immediately
      const posted = await interaction.channel.send({ embeds: [buildStickyEmbed(content)] }).catch(() => null);
      if (posted) {
        const { updateStickyMessageId } = require("../../services/sticky");
        if (typeof updateStickyMessageId === "function") {
          // setSticky didn't store the id; we do it here directly via the service
        }
        // store via service's helper by re-running setSticky path then update
        const { db } = require("../../database/db");
        db.prepare("UPDATE sticky_messages SET last_message_id = ? WHERE channel_id = ?")
          .run(posted.id, interaction.channel.id);
      }
      return interaction.reply(
        withOwnerExtras(interaction, { embeds: [successEmbed("Sticky set for this channel.")], ephemeral: true })
      );
    }

    if (sub === "clear") {
      const existing = getSticky(interaction.channel.id);
      if (existing?.last_message_id) {
        const old = await interaction.channel.messages.fetch(existing.last_message_id).catch(() => null);
        if (old) await old.delete().catch(() => {});
      }
      clearSticky(interaction.channel.id);
      return interaction.reply(
        withOwnerExtras(interaction, { embeds: [successEmbed("Sticky cleared.")], ephemeral: true })
      );
    }

    // view
    const existing = getSticky(interaction.channel.id);
    if (!existing) {
      return interaction.reply(
        withOwnerExtras(interaction, { content: "No sticky set for this channel.", ephemeral: true })
      );
    }
    return interaction.reply(
      withOwnerExtras(interaction, { embeds: [buildStickyEmbed(existing.content)], ephemeral: true })
    );
  },
};
