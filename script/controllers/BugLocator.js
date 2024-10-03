const fs = require('fs');

const findAndReadTxtFiles = async (baseDirectory) => {
    try {
      const files = await fs.promises.readdir(baseDirectory);
      
      // Find the unknown folder (assuming there's only one unknown folder)
      const unknownTextFolder = files.find(file => fs.statSync(path.join(baseDirectory, file)).isDirectory());
  
      if (unknownTextFolder) {
        const recommendedDirectory = path.join(baseDirectory, unknownTextFolder, 'recommended');
  
        console.log(`Waiting for the recommended directory to be created: ${recommendedDirectory}`);
  
        // Wait for the recommended directory to be created
        await waitForDirectory(recommendedDirectory);
  
        console.log(`Recommended directory found: ${recommendedDirectory}`);
  
        const txtFiles = await fs.promises.readdir(recommendedDirectory);
  
        // Iterate over each .txt file
        txtFiles.forEach(file => {
          if (file.endsWith('.txt')) {
            const filePath = path.join(recommendedDirectory, file);
  
            // Print the file name
            console.log(`\ntxt file name: ${file}`);
  
            fs.readFile(filePath, 'utf8', (err, content) => {
              if (err) {
                return console.error('Unable to read file:', err);
              }
              const lines = content.split('\n');
              const first10Lines = lines.slice(0, 10).join('\n');
              console.log(`First 10 lines of ${filePath}:\n${first10Lines}`);
            });
          }
        });
      } else {
        console.error('No unknown folder found');
      }
    } catch (err) {
      console.error('Error scanning directory:', err);
    }
  };


  module.exports={
    findAndReadTxtFiles
  }