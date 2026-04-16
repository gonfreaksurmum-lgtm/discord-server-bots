const { handleUpdatesNav } = require("../../services/updatesNav");
module.exports = {
  customId: "updates:next",
  execute: (i) => handleUpdatesNav(i, "next"),
};
