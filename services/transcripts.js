const fs = require("fs");
const path = require("path");

async function saveTranscript(channel) {
  const messages = [];
  let before;

  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
    if (!batch || !batch.size) break;
    messages.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
    if (messages.length >= 1000) break;
  }

  const ordered = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  const lines = ordered.map((m) => {
    const ts = new Date(m.createdTimestamp).toISOString();
    const content = m.content || (m.attachments.size ? `[attachments: ${m.attachments.map((a) => a.url).join(", ")}]` : "");
    return `[${ts}] ${m.author?.tag || m.author?.id || "unknown"}: ${content}`;
  });

  const dir = path.join(process.cwd(), "data", "transcripts");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${channel.guild.id}-${channel.id}-${Date.now()}.md`);
  fs.writeFileSync(filePath, `# Transcript for #${channel.name}\n\n${lines.join("\n")}`, "utf8");
  return filePath;
}

module.exports = { saveTranscript };
