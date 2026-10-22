require('dotenv').config({ path: process.env.DOTENV_PATH });
const fs = require('fs');
const path = require('path');
const electron_notarize = require('electron-notarize');

const notarize = async function (params) {
  if (process.platform !== 'darwin') {
    return;
  }

  // Notarization needs an Apple Developer account; builds without one stay unsigned and skip it.
  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD || !process.env.APPLE_TEAM_ID) {
    console.log('Skipping notarization: APPLE_ID, APPLE_ID_PASSWORD or APPLE_TEAM_ID is not set');
    return;
  }

  const appId = params.packager.appInfo.id;

  let appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
  if (!fs.existsSync(appPath)) {
    console.error(`Cannot find application at: ${appPath}`);
    return;
  }

  console.log(`Notarizing ${appId} found at ${appPath} using Apple ID ${process.env.APPLE_ID}`);
  const teamId = process.env.APPLE_TEAM_ID;
  try {
    await electron_notarize.notarize({
      tool: 'notarytool',
      appBundleId: appId,
      appPath: appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      ascProvider: teamId,
      teamId: teamId
    });
  } catch (error) {
    console.error(error);
  }

  console.log(`Done notarizing ${appPath}`);
};

module.exports = notarize;
