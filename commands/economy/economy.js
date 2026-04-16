const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { getBalance, claimDaily, work, transferMoney, listShop, addShopItem, buyItem, getInventory, addMoney } = require("../../services/economy");
const { db } = require("../../database/db");
const { successEmbed, infoEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("economy")
    .setDescription("Economy and shop commands.")
    .addSubcommand((s) => s.setName("balance").setDescription("View a balance").addUserOption((o) => o.setName("user").setDescription("Target")))
    .addSubcommand((s) => s.setName("daily").setDescription("Claim your daily"))
    .addSubcommand((s) => s.setName("work").setDescription("Work for coins"))
    .addSubcommand((s) => s.setName("give").setDescription("Give coins")
      .addUserOption((o) => o.setName("user").setDescription("Target").setRequired(true))
      .addIntegerOption((o) => o.setName("amount").setDescription("Amount").setRequired(true)))
    .addSubcommand((s) => s.setName("deposit").setDescription("Move money to your bank")
      .addIntegerOption((o) => o.setName("amount").setDescription("Amount").setRequired(true)))
    .addSubcommand((s) => s.setName("withdraw").setDescription("Move money from your bank")
      .addIntegerOption((o) => o.setName("amount").setDescription("Amount").setRequired(true)))
    .addSubcommand((s) => s.setName("leaderboard").setDescription("Top wallet balances"))
    .addSubcommand((s) => s.setName("shop").setDescription("View the shop"))
    .addSubcommand((s) => s.setName("buy").setDescription("Buy an item").addStringOption((o) => o.setName("item").setDescription("Item key").setRequired(true)))
    .addSubcommand((s) => s.setName("inventory").setDescription("View your inventory").addUserOption((o) => o.setName("user").setDescription("Target")))
    .addSubcommand((s) => s.setName("additem").setDescription("Add a shop item")
      .addStringOption((o) => o.setName("key").setDescription("Unique key").setRequired(true))
      .addStringOption((o) => o.setName("name").setDescription("Display name").setRequired(true))
      .addIntegerOption((o) => o.setName("price").setDescription("Price").setRequired(true))
      .addStringOption((o) => o.setName("description").setDescription("Description")))
    .addSubcommand((s) => s.setName("addroleitem").setDescription("Add a role shop item")
      .addStringOption((o) => o.setName("key").setDescription("Unique key").setRequired(true))
      .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true))
      .addIntegerOption((o) => o.setName("price").setDescription("Price").setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "balance") {
      const user = interaction.options.getUser("user") || interaction.user;
      const bal = getBalance(interaction.guild.id, user.id);
      return interaction.reply({ embeds: [infoEmbed(`${user.username}'s Balance`, `Wallet: **${bal.wallet}**\nBank: **${bal.bank}**\nNet Worth: **${bal.wallet + bal.bank}**`)] });
    }

    if (sub === "daily") {
      const amount = claimDaily(interaction.guild.id, interaction.user.id);
      return interaction.reply({ embeds: [successEmbed(`You claimed ${amount} coins.`)] });
    }

    if (sub === "work") {
      const amount = work(interaction.guild.id, interaction.user.id);
      return interaction.reply({ embeds: [successEmbed(`You worked and earned ${amount} coins.`)] });
    }

    if (sub === "give") {
      const user = interaction.options.getUser("user", true);
      const amount = interaction.options.getInteger("amount", true);
      if (amount <= 0) throw new Error("Amount must be positive.");
      if (user.id === interaction.user.id) throw new Error("You cannot pay yourself.");
      transferMoney(interaction.guild.id, interaction.user.id, user.id, amount);
      return interaction.reply({ embeds: [successEmbed(`Transferred ${amount} coins to ${user}.`)] });
    }

    if (sub === "deposit") {
      const amount = interaction.options.getInteger("amount", true);
      const bal = getBalance(interaction.guild.id, interaction.user.id);
      if (amount <= 0 || bal.wallet < amount) throw new Error("Invalid deposit amount.");
      db.prepare("UPDATE economy_balances SET wallet = wallet - ?, bank = bank + ? WHERE guild_id = ? AND user_id = ?")
        .run(amount, amount, interaction.guild.id, interaction.user.id);
      return interaction.reply({ embeds: [successEmbed(`Deposited ${amount} coins.`)] });
    }

    if (sub === "withdraw") {
      const amount = interaction.options.getInteger("amount", true);
      const bal = getBalance(interaction.guild.id, interaction.user.id);
      if (amount <= 0 || bal.bank < amount) throw new Error("Invalid withdraw amount.");
      db.prepare("UPDATE economy_balances SET bank = bank - ?, wallet = wallet + ? WHERE guild_id = ? AND user_id = ?")
        .run(amount, amount, interaction.guild.id, interaction.user.id);
      return interaction.reply({ embeds: [successEmbed(`Withdrew ${amount} coins.`)] });
    }

    if (sub === "leaderboard") {
      const rows = db.prepare(`
        SELECT user_id, wallet, bank, (wallet + bank) AS net
        FROM economy_balances
        WHERE guild_id = ?
        ORDER BY net DESC
        LIMIT 10
      `).all(interaction.guild.id);
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor("#C084FC").setTitle("Economy Leaderboard").setDescription(rows.length ? rows.map((r, i) => `${i + 1}. <@${r.user_id}> • **${r.net}**`).join("\n") : "No data yet.")]
      });
    }

    if (sub === "shop") {
      const rows = listShop(interaction.guild.id);
      return interaction.reply({ embeds: [infoEmbed("Shop", rows.length ? rows.slice(0, 20).map((r) => `\`${r.item_key}\` — **${r.name}** • ${r.price}`).join("\n") : "Shop is empty.")] });
    }

    if (sub === "buy") {
      const item = await buyItem(interaction.member, interaction.options.getString("item", true));
      return interaction.reply({ embeds: [successEmbed(`Purchased **${item.name}** for **${item.price}** coins.`)] });
    }

    if (sub === "inventory") {
      const user = interaction.options.getUser("user") || interaction.user;
      const rows = getInventory(interaction.guild.id, user.id);
      return interaction.reply({ embeds: [infoEmbed(`${user.username}'s Inventory`, rows.length ? rows.map((r) => `• ${r.name || r.item_key} × ${r.quantity}`).join("\n") : "Inventory is empty.")] });
    }

    if (sub === "additem") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) throw new Error("Manage Server required.");
      addShopItem(interaction.guild.id, {
        item_key: interaction.options.getString("key", true),
        name: interaction.options.getString("name", true),
        price: interaction.options.getInteger("price", true),
        description: interaction.options.getString("description") || "",
      });
      return interaction.reply({ embeds: [successEmbed("Shop item added.")], ephemeral: true });
    }

    if (sub === "addroleitem") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) throw new Error("Manage Server required.");
      const role = interaction.options.getRole("role", true);
      addShopItem(interaction.guild.id, {
        item_key: interaction.options.getString("key", true),
        item_type: "role",
        name: role.name,
        price: interaction.options.getInteger("price", true),
        role_id: role.id,
        description: `Role item for ${role.name}`,
      });
      return interaction.reply({ embeds: [successEmbed("Role shop item added.")], ephemeral: true });
    }
  },
};
