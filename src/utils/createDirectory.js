const fs = require('fs-extra');

async function createDirectory(directoryPath) {
    await fs.remove(directoryPath);
    await fs.mkdirp(directoryPath);
  }
  
module.exports = { createDirectory };