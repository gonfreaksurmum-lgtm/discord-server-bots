const { db } = require("../database/db");

function ensureBalance(guildId, userId) {
  db.prepare(`
    INSERT INTO economy_balances (guild_id, user_id, wallet, bank, last_daily, last_work)
    VALUES (?, ?, 0, 0, 0, 0)
    ON CONFLICT(guild_id, user_id) DO NOTHING
  `).run(guildId, userId);
  return getBalance(guildId, userId);
}
function getBalance(guildId, userId) {
  return db.prepare("SELECT * FROM economy_balances WHERE guild_id = ? AND user_id = ?").get(guildId, userId)
    || { guild_id: guildId, user_id: userId, wallet: 0, bank: 0, last_daily: 0, last_work: 0 };
}
function addMoney(guildId, userId, amount) {
  const bal = ensureBalance(guildId, userId);
  db.prepare("UPDATE economy_balances SET wallet = ? WHERE guild_id = ? AND user_id = ?").run(bal.wallet + amount, guildId, userId);
  return getBalance(guildId, userId);
}
function transferMoney(guildId, fromId, toId, amount) {
  const from = ensureBalance(guildId, fromId);
  if (from.wallet < amount) throw new Error("Not enough balance.");
  addMoney(guildId, fromId, -amount);
  addMoney(guildId, toId, amount);
}
function canDaily(guildId, userId) {
  const bal = ensureBalance(guildId, userId);
  return Date.now() - bal.last_daily >= 86_400_000;
}
function claimDaily(guildId, userId) {
  if (!canDaily(guildId, userId)) throw new Error("Daily already claimed.");
  const amount = 250;
  const bal = ensureBalance(guildId, userId);
  db.prepare("UPDATE economy_balances SET wallet = ?, last_daily = ? WHERE guild_id = ? AND user_id = ?")
    .run(bal.wallet + amount, Date.now(), guildId, userId);
  return amount;
}
function canWork(guildId, userId) {
  const bal = ensureBalance(guildId, userId);
  return Date.now() - bal.last_work >= 3_600_000;
}
function work(guildId, userId) {
  if (!canWork(guildId, userId)) throw new Error("Work is on cooldown.");
  const amount = Math.floor(Math.random() * 151) + 100;
  const bal = ensureBalance(guildId, userId);
  db.prepare("UPDATE economy_balances SET wallet = ?, last_work = ? WHERE guild_id = ? AND user_id = ?")
    .run(bal.wallet + amount, Date.now(), guildId, userId);
  return amount;
}
function listShop(guildId) {
  return db.prepare("SELECT * FROM shop_items WHERE guild_id = ? ORDER BY price ASC, name ASC").all(guildId);
}
function addShopItem(guildId, item) {
  db.prepare(`
    INSERT OR REPLACE INTO shop_items (guild_id, item_key, item_type, name, description, price, role_id, stock, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, item.item_key, item.item_type || "item", item.name, item.description || "", item.price, item.role_id || null, item.stock ?? -1, JSON.stringify(item.metadata || {}));
}
async function buyItem(member, itemKey) {
  const item = db.prepare("SELECT * FROM shop_items WHERE guild_id = ? AND item_key = ?").get(member.guild.id, itemKey);
  if (!item) throw new Error("Item not found.");
  const bal = ensureBalance(member.guild.id, member.id);
  if (bal.wallet < item.price) throw new Error("Not enough balance.");
  if (item.stock === 0) throw new Error("Item is out of stock.");
  db.prepare("UPDATE economy_balances SET wallet = wallet - ? WHERE guild_id = ? AND user_id = ?").run(item.price, member.guild.id, member.id);
  if (item.item_type === "role" && item.role_id) {
    const role = member.guild.roles.cache.get(item.role_id);
    if (!role) throw new Error("Shop role no longer exists.");
    await member.roles.add(role, "Purchased from role shop");
  } else {
    db.prepare(`
      INSERT INTO inventories (guild_id, user_id, item_key, quantity)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(guild_id, user_id, item_key) DO UPDATE SET quantity = quantity + 1
    `).run(member.guild.id, member.id, itemKey);
  }
  if (item.stock > 0) {
    db.prepare("UPDATE shop_items SET stock = stock - 1 WHERE guild_id = ? AND item_key = ?").run(member.guild.id, itemKey);
  }
  return item;
}
function getInventory(guildId, userId) {
  return db.prepare(`
    SELECT i.item_key, i.quantity, s.name
    FROM inventories i LEFT JOIN shop_items s ON s.guild_id = i.guild_id AND s.item_key = i.item_key
    WHERE i.guild_id = ? AND i.user_id = ?
    ORDER BY i.quantity DESC
  `).all(guildId, userId);
}
module.exports = {
  ensureBalance, getBalance, addMoney, transferMoney, canDaily, claimDaily, canWork, work, listShop, addShopItem, buyItem, getInventory,
};
