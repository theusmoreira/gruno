const { execSync } = require('child_process');

// Native packages that npm only installs for the machine's own architecture. Both architectures are
// force installed so a build can package either one. Keep them hard pinned, and add a dependency here
// only after checking it for vulnerabilities, since these bypass the lockfile.
const PLATFORM_DEPS = {
  darwin: ['@lydell/node-pty-darwin-arm64@1.1.0', '@lydell/node-pty-darwin-x64@1.1.0'],
  win32: ['@lydell/node-pty-win32-arm64@1.1.0', '@lydell/node-pty-win32-x64@1.1.0'],
  linux: ['@lydell/node-pty-linux-arm64@1.1.0', '@lydell/node-pty-linux-x64@1.1.0']
};

const installPlatformDeps = (platform = process.platform) => {
  const deps = PLATFORM_DEPS[platform] || [];
  if (deps.length === 0) return;

  execSync(`npm i --legacy-peer-deps --no-save --force ${deps.join(' ')}`, { stdio: 'inherit' });
};

module.exports = { installPlatformDeps };

if (require.main === module) {
  installPlatformDeps();
}
