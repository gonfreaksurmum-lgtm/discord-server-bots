// ============================================================================
// /config — hybrid config command
// ----------------------------------------------------------------------------
// Handles simple toggles and per-channel setup for Phase 3 features.
// Rich-UX features (sticky, reactionrole, autoresponder, fame, shame) have
// their own dedicated top-level commands.
// ============================================================================

const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const { setSettings, getSettings } = require("../../database/db");
const {
  FEATURES, isEnabled, setEnabled, listFeatures,
} = require("../../services/featureToggles");
const autoThread = require("../../services/autoThread");
const mediaOnly  = require("../../services/mediaOnly");
const { canManageBot } = require("../../utils/permissions");
const { successEmbed } = require("../../utils/embeds");
const { withOwnerExtras } = require("../../utils/ownerResponse");
const config = require("../../config");

// Build a dynamic choice list so /config feature-toggle only offers valid keys.
const featureChoices = Object.entries(FEATURES)
  .map(([k, v]) => ({ name: v.label, value: k }))
  .slice(0, 25);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configure Phase 3+ bot features")

    // --- Feature toggles -------------------------------------------------
    .addSubcommandGroup((g) =>
      g.setName("feature").setDescription("Enable / disable features")
        .addSubcommand((s) =>
          s.setName("toggle").setDescription("Turn a feature on or off")
            .addStringOption((o) => o.setName("feature").setDescription("Feature").setRequired(true).addChoices(...featureChoices))
            .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)))
        .addSubcommand((s) =>
          s.setName("list").setDescription("List all features and their states")))

    // --- Welcome / leave -------------------------------------------------
    .addSubcommandGroup((g) =>
      g.setName("welcome").setDescription("Welcome & leave messages")
        .addSubcommand((s) =>
          s.setName("channel").setDescription("Set the welcome channel")
            .addChannelOption((o) => o.setName("channel").setDescription("Welcome channel").addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand((s) =>
          s.setName("message").setDescription("Set the welcome message (supports {user} {mention} {server} {memberCount} {inviter} {inviteCode} {inviteCount})")
            .addStringOption((o) => o.setName("title").setDescription("Embed title"))
            .addStringOption((o) => o.setName("description").setDescription("Embed description")))
        .addSubcommand((s) =>
          s.setName("leave-channel").setDescription("Set the leave channel")
            .addChannelOption((o) => o.setName("channel").setDescription("Leave channel").addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand((s) =>
          s.setName("leave-message").setDescription("Set the leave message template")
            .addStringOption((o) => o.setName("title").setDescription("Embed title"))
            .addStringOption((o) => o.setName("description").setDescription("Embed description"))))

    // --- Auto-thread -----------------------------------------------------
    .addSubcommandGroup((g) =>
      g.setName("autothread").setDescription("Auto-thread channels")
        .addSubcommand((s) =>
          s.setName("add").setDescription("Make a channel auto-thread on every message")
            .addChannelOption((o) => o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
            .addStringOption((o) => o.setName("template").setDescription("Thread name template (supports {title} {user})"))
            .addIntegerOption((o) => o.setName("archive").setDescription("Archive after minutes (60/1440/4320/10080)")
              .addChoices(
                { name: "1 hour",   value: 60    },
                { name: "24 hours", value: 1440  },
                { name: "3 days",   value: 4320  },
                { name: "7 days",   value: 10080 },
              ))
            .addIntegerOption((o) => o.setName("slowmode").setDescription("Thread slowmode seconds")))
        .addSubcommand((s) =>
          s.setName("remove").setDescription("Stop auto-threading a channel")
            .addChannelOption((o) => o.setName("channel").setDescription("Channel").setRequired(true)))
        .addSubcommand((s) =>
          s.setName("list").setDescription("List all auto-thread channels")))

    // --- Media-only ------------------------------------------------------
    .addSubcommandGroup((g) =>
      g.setName("mediaonly").setDescription("Media-only channels")
        .addSubcommand((s) =>
          s.setName("add").setDescription("Make a channel media-only")
            .addChannelOption((o) => o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
            .addBooleanOption((o) => o.setName("allowlinks").setDescription("Allow regular links as 'media'?"))
            .addBooleanOption((o) => o.setName("allowgifs").setDescription("Allow tenor/giphy/imgur links?")))
        .addSubcommand((s) =>
          s.setName("remove").setDescription("Remove media-only setting")
            .addChannelOption((o) => o.setName("channel").setDescription("Channel").setRequired(true)))
        .addSubcommand((s) =>
          s.setName("list").setDescription("List media-only channels")))

    // --- Starboard filters ----------------------------------------------
    .addSubcommandGroup((g) =>
      g.setName("starboard").setDescription("Starboard filters")
        .addSubcommand((s) =>
          s.setName("threshold").setDescription("Minimum stars required")
            .addIntegerOption((o) => o.setName("count").setDescription("Min stars").setMinValue(1).setMaxValue(50).setRequired(true)))
        .addSubcommand((s) =>
          s.setName("ignorebots").setDescription("Ignore bot messages on starboard")
            .addBooleanOption((o) => o.setName("enabled").setDescription("Ignore bots?").setRequired(true)))
        .addSubcommand((s) =>
          s.setName("ignore-channel").setDescription("Block a channel from reaching the starboard")
            .addChannelOption((o) => o.setName("channel").setDescription("Channel").setRequired(true)))
        .addSubcommand((s) =>
          s.setName("unignore-channel").setDescription("Remove a channel from the ignore list")
            .addChannelOption((o) => o.setName("channel").setDescription("Channel").setRequired(true)))
        .addSubcommand((s) =>
          s.setName("show").setDescription("Show current starboard filter config"))),

  async execute(interaction) {
    if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // --------- FEATURE TOGGLES -----------
    if (group === "feature" && sub === "toggle") {
      const feature = interaction.options.getString("feature", true);
      const enabled = interaction.options.getBoolean("enabled", true);
      setEnabled(guildId, feature, enabled);
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed(`\`${FEATURES[feature].label}\` is now ${enabled ? "**enabled**" : "**disabled**"}.`)], ephemeral: true },
        { extras: { Feature: feature, State: enabled ? "on" : "off" } }
      ));
    }
    if (group === "feature" && sub === "list") {
      const features = listFeatures(guildId);
      const byPhase = {};
      for (const f of features) (byPhase[f.phase] ??= []).push(f);
      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle("Feature Toggles")
        .setTimestamp();
      for (const [phase, feats] of Object.entries(byPhase)) {
        embed.addFields({
          name: `Phase ${phase}`,
          value: feats.map((f) => `${f.enabled ? "🟢" : "⚪"} **${f.label}** \`${f.key}\``).join("\n").slice(0, 1024),
        });
      }
      return interaction.reply(withOwnerExtras(interaction, { embeds: [embed], ephemeral: true }));
    }

    // --------- WELCOME -----------
    if (group === "welcome" && sub === "channel") {
      const ch = interaction.options.getChannel("channel", true);
      setSettings(guildId, { welcomeChannelId: ch.id });
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed(`Welcome channel set to ${ch}.`)], ephemeral: true }
      ));
    }
    if (group === "welcome" && sub === "message") {
      const patch = {};
      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description");
      if (title) patch.welcomeTitle = title;
      if (description) patch.welcomeMessage = description;
      if (!Object.keys(patch).length) throw new Error("Provide a title and/or description.");
      setSettings(guildId, patch);
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed("Welcome message template updated.")], ephemeral: true }
      ));
    }
    if (group === "welcome" && sub === "leave-channel") {
      const ch = interaction.options.getChannel("channel", true);
      setSettings(guildId, { leaveChannelId: ch.id });
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed(`Leave channel set to ${ch}.`)], ephemeral: true }
      ));
    }
    if (group === "welcome" && sub === "leave-message") {
      const patch = {};
      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description");
      if (title) patch.leaveTitle = title;
      if (description) patch.leaveMessage = description;
      if (!Object.keys(patch).length) throw new Error("Provide a title and/or description.");
      setSettings(guildId, patch);
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed("Leave message template updated.")], ephemeral: true }
      ));
    }

    // --------- AUTO-THREAD -----------
    if (group === "autothread" && sub === "add") {
      const ch = interaction.options.getChannel("channel", true);
      autoThread.addAutoThreadChannel({
        channelId: ch.id, guildId,
        nameTemplate: interaction.options.getString("template") || "Discussion: {title}",
        archiveAfterMinutes: interaction.options.getInteger("archive") ?? 1440,
        slowmode: interaction.options.getInteger("slowmode") ?? 0,
      });
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed(`${ch} will now auto-thread new messages.`)], ephemeral: true }
      ));
    }
    if (group === "autothread" && sub === "remove") {
      const ch = interaction.options.getChannel("channel", true);
      autoThread.removeAutoThreadChannel(ch.id);
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed(`${ch} no longer auto-threads.`)], ephemeral: true }
      ));
    }
    if (group === "autothread" && sub === "list") {
      const rows = autoThread.listAutoThreadChannels(guildId);
      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`Auto-Thread Channels (${rows.length})`)
        .setDescription(rows.length
          ? rows.map((r) => `<#${r.channel_id}> — \`${r.name_template}\` · archive ${r.archive_after_minutes}m · slow ${r.slowmode_seconds}s`).join("\n").slice(0, 4000)
          : "None configured.");
      return interaction.reply(withOwnerExtras(interaction, { embeds: [embed], ephemeral: true }));
    }

    // --------- MEDIA-ONLY -----------
    if (group === "mediaonly" && sub === "add") {
      const ch = interaction.options.getChannel("channel", true);
      mediaOnly.addChannel({
        channelId: ch.id, guildId,
        allowLinks: interaction.options.getBoolean("allowlinks") ?? false,
        allowGifs:  interaction.options.getBoolean("allowgifs")  ?? true,
      });
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed(`${ch} is now media-only.`)], ephemeral: true }
      ));
    }
    if (group === "mediaonly" && sub === "remove") {
      const ch = interaction.options.getChannel("channel", true);
      mediaOnly.removeChannel(ch.id);
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed(`${ch} is no longer media-only.`)], ephemeral: true }
      ));
    }
    if (group === "mediaonly" && sub === "list") {
      const rows = mediaOnly.listChannels(guildId);
      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`Media-Only Channels (${rows.length})`)
        .setDescription(rows.length
          ? rows.map((r) => `<#${r.channel_id}> · links:${r.allow_links ? "✅" : "❌"} gifs:${r.allow_gifs ? "✅" : "❌"}`).join("\n").slice(0, 4000)
          : "None configured.");
      return interaction.reply(withOwnerExtras(interaction, { embeds: [embed], ephemeral: true }));
    }

    // --------- STARBOARD FILTERS -----------
    if (group === "starboard" && sub === "threshold") {
      setSettings(guildId, { starboardMinStars: interaction.options.getInteger("count", true) });
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed(`Starboard threshold updated.`)], ephemeral: true }
      ));
    }
    if (group === "starboard" && sub === "ignorebots") {
      setSettings(guildId, { starboardIgnoreBots: interaction.options.getBoolean("enabled", true) });
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed(`Starboard ignore-bots updated.`)], ephemeral: true }
      ));
    }
    if (group === "starboard" && sub === "ignore-channel") {
      const ch = interaction.options.getChannel("channel", true);
      const cur = getSettings(guildId);
      const list = new Set(Array.isArray(cur.starboardIgnoredChannels) ? cur.starboardIgnoredChannels : []);
      list.add(ch.id);
      setSettings(guildId, { starboardIgnoredChannels: [...list] });
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed(`${ch} is now ignored by the starboard.`)], ephemeral: true }
      ));
    }
    if (group === "starboard" && sub === "unignore-channel") {
      const ch = interaction.options.getChannel("channel", true);
      const cur = getSettings(guildId);
      const list = (Array.isArray(cur.starboardIgnoredChannels) ? cur.starboardIgnoredChannels : [])
        .filter((id) => id !== ch.id);
      setSettings(guildId, { starboardIgnoredChannels: list });
      return interaction.reply(withOwnerExtras(interaction,
        { embeds: [successEmbed(`${ch} removed from starboard ignore list.`)], ephemeral: true }
      ));
    }
    if (group === "starboard" && sub === "show") {
      const s = getSettings(guildId);
      const ignored = (s.starboardIgnoredChannels || []).map((id) => `<#${id}>`).join(", ") || "none";
      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle("Starboard Filters")
        .addFields(
          { name: "Min stars",  value: `${s.starboardMinStars ?? 3}`,            inline: true },
          { name: "Ignore bots", value: `${s.starboardIgnoreBots ?? true}`,       inline: true },
          { name: "Filters enabled", value: `${isEnabled(guildId, "starboardFilters")}`, inline: true },
          { name: "Ignored channels", value: ignored }
        );
      return interaction.reply(withOwnerExtras(interaction, { embeds: [embed], ephemeral: true }));
    }

    throw new Error("Unknown config subcommand.");
  },
};
