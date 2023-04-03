const fs = require('fs');
const util = require('util');
const path = require('path');
const writeFile = util.promisify(fs.writeFile);

async function createSVG(text, dir) {
     //doesnt write correctly?
  //const svgString = `<?xml version="1.0" encoding="utf-8"?><svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect x="0" y="0" width="200" height="100" rx="40" ry="40" fill="#8a0000"/><text x="50%" y="50%" font-size="8vw" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">${text}</text></svg>`;
  const svgString = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect x="0" y="0" width="200" height="100" rx="40" ry="40" fill="#6317bf"/><text x="50%" y="75%" font-size="90" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">${text}</text></svg>`;

  const filename = `${text}.svg`;

  const filePath = path.join(dir, filename);
  try {
    await writeFile(filePath, svgString);
  //  console.log(`SVG file '${filename}' created successfully`);
  } catch (err) {
    console.error(err);
  }
}

module.exports = { createSVG };
