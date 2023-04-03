const fs = require('fs').promises;

async function readFile(path, encoding) {
  try {
    const data = await fs.readFile(path, encoding);
    return data;
  } catch (error) {
    console.error(`Error reading file at ${path}: ${error}`);
    throw error;
  }
}

module.exports = { readFile };