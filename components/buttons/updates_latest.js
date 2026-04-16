const { handleUpdatesNav } = require("../../services/updatesNav");
module.exports = {
  customId: "updates:latest",
  execute: (i) => handleUpdatesNav(i, "latest"),
};
