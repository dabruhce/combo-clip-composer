const fs = require('fs');
const fse = require('fs-extra');

async function copyFileToDirectory(srcPath, destPath) {
  try {
    const srcFileExists = await checkPathExists(srcPath);
    if (!srcFileExists) {
      console.error(`Error: source file ${srcPath} does not exist!`);
      return;
    }
    await fse.copy(srcPath, destPath);
    console.log(`File ${srcPath} copied to ${destPath} successfully!`);
  } catch (error) {
    console.error(`Error copying file: ${error}`);
  }
}

async function checkPathExists(filePath) {
  try {
    const fileExists = await fse.pathExists(filePath);
    return fileExists;
  } catch (error) {
    console.error(`Error checking if file ${filePath} exists: ${error}`);
    return false;
  }
}

async function checkFileExists(filePath) {
    try {
      await fse.access(filePath, fs.constants.F_OK);
      const stats = await fse.stat(filePath);
      return stats.isFile();
    } catch (error) {
//      console.error(`Error checking if file ${filePath} exists: ${error}`);
      return false;
    }
  }

module.exports = {
  copyFileToDirectory, checkFileExists
};
