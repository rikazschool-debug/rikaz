const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceNodeModules = path.resolve(projectRoot, "../node_modules");
const config = getDefaultConfig(projectRoot);

// The Replit workspace may store pnpm's virtual store one directory above this
// checkout; include it only when it exists so standalone installs still work.
const hasWorkspaceNodeModules = fs.existsSync(workspaceNodeModules);
if (hasWorkspaceNodeModules) {
  config.watchFolders = [...config.watchFolders, workspaceNodeModules];
}
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  ...(hasWorkspaceNodeModules ? [workspaceNodeModules] : []),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
