const { errorEmbed } = require("../utils/embeds");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        return command.execute(interaction, client);
      }

      if (interaction.isButton()) {
        const parts = interaction.customId.split(":");
        const key2 = parts.slice(0, 2).join(":");
        const key1 = parts[0];
        const exact  = client.buttons.get(interaction.customId);
        const prefix = client.buttons.get(key2);
        const root   = client.buttons.get(key1);
        const handler = exact || prefix || root;
        if (handler) return handler.execute(interaction, client);
      }

      if (interaction.isAnySelectMenu()) {
        const parts = interaction.customId.split(":");
        const key2 = parts.slice(0, 2).join(":");
        const key1 = parts[0];
        const exact  = client.selectMenus.get(interaction.customId);
        const prefix = client.selectMenus.get(key2);
        const root   = client.selectMenus.get(key1);
        const handler = exact || prefix || root;
        if (handler) return handler.execute(interaction, client);
      }

      if (interaction.isModalSubmit()) {
        const key = interaction.customId.split(":").slice(0, 2).join(":");
        const exact = client.modals.get(interaction.customId);
        const prefix = client.modals.get(key);
        const handler = exact || prefix;
        if (handler) return handler.execute(interaction, client);
      }
    } catch (error) {
      console.error(error);
      const payload = { embeds: [errorEmbed(error.message || "Something went wrong.")] };
      if (interaction.deferred || interaction.replied) {
        return interaction.followUp({ ...payload, ephemeral: true }).catch(() => {});
      }
      return interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
    }
  },
};
