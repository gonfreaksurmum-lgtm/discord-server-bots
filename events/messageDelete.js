const { db } = require("../database/db");

module.exports = {
  name: "messageDelete",
  async execute(message) {
    if (!message.guild || message.author?.bot) return;
    db.prepare(`
      INSERT INTO snipes (channel_id, author_id, content, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(channel_id) DO UPDATE SET
        author_id = excluded.author_id,
        content = excluded.content,
        created_at = excluded.created_at
    `).run(message.channel.id, message.author.id, message.content || "", Date.now());
  },
};
