const { handleUpdatesNav } = require("../../services/updatesNav");
module.exports = {
  customId: "updates:prev",
  execute: (i) => handleUpdatesNav(i, "prev"),
};
