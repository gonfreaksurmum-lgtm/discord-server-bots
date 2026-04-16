const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { sendPanel } = require("../../services/reactionRoles");
const { canManageBot } = require("../../utils/permissions");
const { successEmbed } = require("../../utils/embeds");
const { withOwnerExtras } = require("../../utils/ownerResponse");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("Create a select-menu reaction-role panel")
    .addSubcommand((s) =>
      s.setName("create").setDescription("Create a panel (up to 5 roles via this command)")
        .addStringOption((o) => o.setName("title").setDescription("Panel title").setRequired(true))
        .addRoleOption((o) => o.setName("role1").setDescription("Role 1").setRequired(true))
        .addStringOption((o) => o.setName("label1").setDescription("Label for role 1").setRequired(true))
        .addStringOption((o) => o.setName("mode").setDescription("Selection mode")
          .addChoices(
            { name: "multi (toggle any)", value: "multi" },
            { name: "single (one at a time)", value: "single" },
            { name: "unique (one-shot)",   value: "unique" }
          ))
        .addStringOption((o) => o.setName("description").setDescription("Panel description"))
        .addChannelOption((o) =>
          o.setName("channel").setDescription("Channel (defaults here)")
            .addChannelTypes(ChannelType.GuildText))
        .addRoleOption((o) => o.setName("role2").setDescription("Role 2"))
        .addStringOption((o) => o.setName("label2").setDescription("Label for role 2"))
        .addRoleOption((o) => o.setName("role3").setDescription("Role 3"))
        .addStringOption((o) => o.setName("label3").setDescription("Label for role 3"))
        .addRoleOption((o) => o.setName("role4").setDescription("Role 4"))
        .addStringOption((o) => o.setName("label4").setDescription("Label for role 4"))
        .addRoleOption((o) => o.setName("role5").setDescription("Role 5"))
        .addStringOption((o) => o.setName("label5").setDescription("Label for role 5"))),

  async execute(interaction) {
    if (!canManageBot(interaction.member)) throw new Error("You do not have permission.");
    const sub = interaction.options.getSubcommand();
    if (sub !== "create") return;

    const options = [];
    for (let i = 1; i <= 5; i++) {
      const role = interaction.options.getRole(`role${i}`);
      const label = interaction.options.getString(`label${i}`);
      if (role && label) options.push({ roleId: role.id, label });
    }
    if (!options.length) throw new Error("No roles provided.");

    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const title = interaction.options.getString("title", true);
    const description = interaction.options.getString("description");
    const mode = interaction.options.getString("mode") || "multi";

    const msg = await sendPanel({
      channel, title, description, mode, options,
      createdBy: interaction.user.id,
    });

    return interaction.reply(withOwnerExtras(interaction,
      { embeds: [successEmbed(`Reaction-role panel sent in ${channel}.`)], ephemeral: true },
      { extras: { PanelID: msg.id, Mode: mode } }
    ));
  },
};
