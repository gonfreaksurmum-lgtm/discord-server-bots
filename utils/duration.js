const ms = require("ms");

function parseDuration(input) {
  try {
    const value = ms(input);
    if (!value || Number.isNaN(value)) return null;
    return value;
  } catch {
    return null;
  }
}

module.exports = { parseDuration };
