const fs = require("fs");
const path = require("path");

const marketplacePath = path.resolve(__dirname, "../../../../.claude-plugin/marketplace.json");

/** Syncs marketplace.json version to the given version string. */
function syncMarketplace(version) {
  const data = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
  data.version = version;
  fs.writeFileSync(marketplacePath, JSON.stringify(data, null, 2) + "\n");
  console.log(`marketplace → ${version}`);
}

module.exports = { syncMarketplace };
