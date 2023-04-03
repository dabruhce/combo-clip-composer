const fs = require('fs');
const path = require('path');

// Define the artifacts directory path
const ARTIFACTS_DIR = path.resolve(__dirname, './artifacts');

// Define the cleanup function
const cleanupArtifacts = () => {
    console.log('Cleaning up artifacts directory:', ARTIFACTS_DIR);
    if (fs.existsSync(ARTIFACTS_DIR)) {
      console.log('Artifacts directory exists');
      fs.readdirSync(ARTIFACTS_DIR).forEach((file) => {
        console.log('Deleting file:', file);
        const filePath = path.resolve(ARTIFACTS_DIR, file);
        fs.unlinkSync(filePath);
      });
      fs.rmdirSync(ARTIFACTS_DIR);
      console.log('Artifacts directory deleted');
    }
  };

// Export the afterAll function
module.exports = async () => {
   console.log('...xxxxxxxxxxxxxxxxxxxxxxxxxxx') 
  cleanupArtifacts();
};
