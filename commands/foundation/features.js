const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,
} = require("discord.js");
const { FEATURES, listFeatures, getFeatureCounts } = require("../../services/featureToggles");
const { canManageBot } = require("../../utils/permissions");
const { withOwnerExtras } = require("../../utils/ownerResponse");

function phaseChoices() {
  const phases = [...new Set(Object.values(FEATURES).map((f) => f.phase))];
  return phases.map((p) => ({ name: `Phase ${p}`, value: String(p) })).slice(0, 25);
}

function buildEmbed(guildId, phase) {
  const items = listFeatures(guildId, phase ? Number(phase) : null);
  const counts = getFeatureCounts(guildId);
  return new EmbedBuilder()
    .setColor("#C084FC")
    .setTitle(phase ? `Feature Toggles • Phase ${phase}` : "Feature Toggles")
    .setDescription(items.map((f) => `${f.enabled ? "🟢" : "🔴"} \`${f.key}\` — ${f.label}`).join("\n").slice(0, 4000) || "No features")
    .addFields(
      { name: "Enabled", value: `${counts.enabled}`, inline: true },
      { name: "Disabled", value: `${counts.disabled}`, inline: true },
      { name: "Total", value: `${counts.total}`, inline: true },
    )
    .setFooter({ text: "Pick a feature below to toggle it." });
}

function buildRows(guildId, phase) {
  const items = listFeatures(guildId, phase ? Number(phase) : null).slice(0, 25);
  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`features:pick:${phase || "all"}`)
      .setPlaceholder("Choose a feature to toggle")
      .addOptions(items.map((f) => ({
        label: f.label.slice(0, 100),
        value: f.key,
        description: `${f.enabled ? "Currently enabled" : "Currently disabled"} • Phase ${f.phase}`,
        emoji: f.enabled ? "🟢" : "🔴"
      })))
  );
  const phases = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("features:phase")
      .setPlaceholder("Filter by phase")
      .addOptions([{ label: "All phases", value: "all", emoji: "📚" }, ...phaseChoices().map((p) => ({ ...p, emoji: "🧩" }))].slice(0,25))
  );
  return [menu, phases];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("features")
    .setDescription("Open the live feature toggle dashboard."),
  async execute(interaction) {
    if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
    const payload = {
      embeds: [buildEmbed(interaction.guild.id)],
      components: buildRows(interaction.guild.id),
      ephemeral: true,
    };
    await interaction.reply(withOwnerExtras(interaction, payload, { extras: { FeatureCount: Object.keys(FEATURES).length } }));
  },
  buildEmbed,
  buildRows,
};
