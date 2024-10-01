const express = require('express');
const app = express();
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

app.use(cors());
app.use(express.json());

const bugLocatorJar = path.resolve(__dirname, '../BugLocator/buglocator.jar');

const bugInfoFile = path.resolve("/mnt/c/Users/BS01319/Documents/EnsembleLocator/bug.xml");

const sourceCodeDir = path.resolve("/mnt/c/Users/BS01319/Documents/AspectJ/gitrepo");

const alphaValue = 0.2

const workingDir = path.resolve(__dirname, './results');

const resultFile = "AspectJResult";

const flags = `-b ${bugInfoFile} -s ${sourceCodeDir} -a ${alphaValue} -w ${workingDir} -n ${resultFile}`


const command = `java -jar ${bugLocatorJar} ${flags}`;



const execCommand = (command)=>{
  return new Promise((resolve, reject)=>{
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing BugLocator: ${error.message}`);
        reject((error));
        return;
      }
    
      if (stderr) {
        console.error(`Error: ${stderr}`);
        reject((stderr));
        return;
      }
    
      console.log(`Output: ${stdout}`);
      resolve(stdout);
    });
  })

}




  const baseDirectory = 'results';




// Helper function to wait until a folder exists
const waitForDirectory = (directoryPath, interval = 1000) => {
  return new Promise((resolve) => {
    const checkDir = setInterval(() => {
      if (fs.existsSync(directoryPath)) {
        clearInterval(checkDir);
        resolve(directoryPath);
      }
    }, interval);
  });
};

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

          // Read and print the file content
          fs.readFile(filePath, 'utf8', (err, content) => {
            if (err) {
              return console.error('Unable to read file:', err);
            }
            console.log(`Content of ${file}:\n${content}`);
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

// Call the function with your base directory
const main = async ()=>{
  await execCommand(command);
  console.log("Bug locator completed execution");

  await findAndReadTxtFiles(workingDir);
}

main();