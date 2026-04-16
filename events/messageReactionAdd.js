const { maybeStar } = require("../services/starboard");

module.exports = {
  name: "messageReactionAdd",
  async execute(reaction) {
    if (reaction.partial) await reaction.fetch().catch(() => {});
    await maybeStar(reaction);
  },
};
