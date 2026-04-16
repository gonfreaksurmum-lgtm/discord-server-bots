const { handleSelect } = require("../../services/reactionRoles");

module.exports = {
  customId: "reactionrole",
  execute: (interaction) => handleSelect(interaction),
};
