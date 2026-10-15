const fs = require("fs");
const path = require("path");

const packagesDir = path.resolve(__dirname, "../../../packages");

/** Syncs all plugin package.json and plugin.json versions to the given version string. */
function syncPlugins(version) {
  for (const plugin of fs.readdirSync(packagesDir)) {
    const pkgPath = path.join(packagesDir, plugin, "package.json");
    const pluginJsonPath = path.join(packagesDir, plugin, ".claude-plugin/plugin.json");

    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      pkg.version = version;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    }

    if (fs.existsSync(pluginJsonPath)) {
      const data = JSON.parse(fs.readFileSync(pluginJsonPath, "utf8"));
      data.version = version;
      fs.writeFileSync(pluginJsonPath, JSON.stringify(data, null, 2) + "\n");
    }

    console.log(`${plugin} → ${version}`);
  }
}

module.exports = { syncPlugins };
