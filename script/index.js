const express = require('express');
const app = express();
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const xml2js = require('xml2js');


app.use(cors());
app.use(express.json());

const bugLocatorJar = path.resolve(__dirname, '../BugLocator/classes/buglocator.jar');

const bugInfoFile = path.resolve("/mnt/c/Users/BS01319/Documents/EnsembleLocator/bug2.xml");

const sourceCodeDir = path.resolve("/mnt/c/Users/BS01319/Documents/AspectJ/gitrepo");

const alphaValue = 0.2;



const xmlParser = require('./controllers/XMLParserAndBuilder.js');

const bugLocator = require('./controllers/BugLocator.js');


// function parseXML(filePath) {
//   return new Promise((resolve, reject) => {
//     console.log(`Attempting to read file: ${filePath}`);
//     fs.readFile(filePath, 'utf8', (err, data) => {
//       if (err) {
//         console.error(`Error reading file ${filePath}:`, err);
//         return reject(err);
//       }
//       console.log(`File read successfully. Parsing XML...`);
//       const parser = new xml2js.Parser();
//       parser.parseString(data, (parseErr, result) => {
//         if (parseErr) {
//           console.error(`Error parsing XML:`, parseErr);
//           return reject(parseErr);
//         }
//         console.log(`XML parsed successfully.`);
//         resolve(result);
//       });
//     });
//   });
// }

// function clearDirectory(directory) {
//   return new Promise((resolve, reject) => {
//     fs.readdir(directory, (err, files) => {
//       if (err) {
//         if (err.code === 'ENOENT') {
//           console.log(`Directory does not exist: ${directory}`);
//           return resolve();
//         }
//         return reject(err);
//       }
//       Promise.all(files.map(file => 
//         new Promise((resolveUnlink, rejectUnlink) => {
//           fs.unlink(path.join(directory, file), (unlinkErr) => {
//             if (unlinkErr) rejectUnlink(unlinkErr);
//             else resolveUnlink();
//           });
//         })
//       )).then(() => {
//         console.log(`Cleared directory: ${directory}`);
//         resolve();
//       }).catch(reject);
//     });
//   });
// }

// function createSeparateXMLFiles(bugs) {
//   return new Promise((resolve, reject) => {
//     fs.mkdir(outputDir, { recursive: true }, async (mkdirErr) => {
//       if (mkdirErr) {
//         return reject(mkdirErr);
//       }
      
//       try {
//         await clearDirectory(outputDir);
        
//         for (let i = 0; i < bugs.length; i++) {
//           const bug = bugs[i];
//           const xmlData = {
//             "pma_xml_export": {
//               "$": {
//                 "version": "1.0",
//                 "xmlns:pma": "http://www.phpmyadmin.net/some_doc_url/"
//               },
//               "database": {
//                 "$": {
//                   "name": "aspectj"
//                 },
//                 "table": bug // Pass the bug directly to table without a 'bug' wrapper
//               }
//             }
//           };

//           const builder = new xml2js.Builder();
//           const xml = builder.buildObject(xmlData);
//           const fileName = `bug_${i+1}.xml`;

//           await new Promise((resolveWrite, rejectWrite) => {
//             fs.writeFile(path.join(outputDir, fileName), xml, (writeErr) => {
//               if (writeErr) rejectWrite(writeErr);
//               else resolveWrite();
//             });
//           });
//         }
//         resolve();
//       } catch (error) {
//         reject(error);
//       }
//     });
//   });
// }



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
        resolve(stdout);
        return;
      }
    
      console.log(`Output: ${stdout}`);
      resolve(stdout);
    });
  })

}


// const findAndReadTxtFiles = async (baseDirectory) => {
//   try {
//     const files = await fs.promises.readdir(baseDirectory);
    
//     // Find the unknown folder (assuming there's only one unknown folder)
//     const unknownTextFolder = files.find(file => fs.statSync(path.join(baseDirectory, file)).isDirectory());

//     if (unknownTextFolder) {
//       const recommendedDirectory = path.join(baseDirectory, unknownTextFolder, 'recommended');

//       console.log(`Waiting for the recommended directory to be created: ${recommendedDirectory}`);

//       // Wait for the recommended directory to be created
//       await waitForDirectory(recommendedDirectory);

//       console.log(`Recommended directory found: ${recommendedDirectory}`);

//       const txtFiles = await fs.promises.readdir(recommendedDirectory);

//       // Iterate over each .txt file
//       txtFiles.forEach(file => {
//         if (file.endsWith('.txt')) {
//           const filePath = path.join(recommendedDirectory, file);

//           // Print the file name
//           console.log(`\ntxt file name: ${file}`);

//           fs.readFile(filePath, 'utf8', (err, content) => {
//             if (err) {
//               return console.error('Unable to read file:', err);
//             }
//             const lines = content.split('\n');
//             const first10Lines = lines.slice(0, 10).join('\n');
//             console.log(`First 10 lines of ${filePath}:\n${first10Lines}`);
//           });
//         }
//       });
//     } else {
//       console.error('No unknown folder found');
//     }
//   } catch (err) {
//     console.error('Error scanning directory:', err);
//   }
// };

async function runCommandForEachFile() {
  const outputDir = path.join(__dirname, './BugReports');

  const files = await fs.promises.readdir(outputDir);
  for (const file of files) {
    if (path.extname(file) === '.xml') {
      const filePath = path.join(outputDir, file);
    
      const workingDir = path.resolve(__dirname, `./results/${file}`);

      const resultFile = "AspectJResult";
      
      const flags = `-b ${filePath} -s ${sourceCodeDir} -a ${alphaValue} -w ${workingDir} -n ${resultFile}`

      const command = `java -jar ${bugLocatorJar} ${flags}`;
      
      
      try {
        await execCommand(command);

        await bugLocator.findAndReadTxtFiles(workingDir);
        //console.log(`Output for ${file}:`, stdout);
      } catch (error) {
        console.error(`Error executing command for ${file}:`, error);
      }
    }
  }
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


// Call the function with your base directory
const main = async ()=>{
  try{
    const parsedXML = await xmlParser.parseXML(bugInfoFile);
    const bugs = parsedXML.pma_xml_export.database[0].table;
    console.log(`Creating separate XML files for ${bugs.length} bugs...`);
    await xmlParser.createSeparateXMLFiles(bugs);
    console.log(`Separate XML files created. Running command for each file...`);
    await runCommandForEachFile();
  //await execCommand(command);
  console.log("Bug locator completed execution");
  
  //await findAndReadTxtFiles(workingDir);
  }catch(error){
    console.error('An error occurred:', error);
  }

}

main();