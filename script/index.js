const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

app.use(cors());
app.use(express.json());


const bugLocatorJar = path.resolve(__dirname, '../BugLocator/classes/buglocator.jar');

const locusJar = path.resolve(__dirname, '../Locus_jar/Locus.jar');

const bluirJar = path.resolve(__dirname, '../BLUiR_jar/BLUiR.jar');

const amalgamJar = path.resolve(__dirname, '../AmaLgam_jar/AmaLgam.jar');

// const bugInfoFile = path.resolve("/mnt/c/Users/BS01319/Documents/EnsembleLocator/bug2.xml");

// const sourceCodeDir = path.resolve("/mnt/c/Users/BS01319/Documents/AspectJ/gitrepo");

// const alphaValue = 0.2;

const xmlParser = require('./controllers/XMLParserAndBuilder.js');

const bugLocator = require('./controllers/BugLocator.js');

const locus = require('./controllers/Locus.js');

const gitController = require('./controllers/GitController.js');

const bluir = require('./controllers/BLUiR.js');

const amalgam = require('./controllers/AmaLgam.js');

async function runCommandForEachFile(sourceCodeDir, alphaValue) {
  const outputDir = path.join(__dirname, './BugReports');

  const files = await fs.promises.readdir(outputDir);
  for (const file of files) {
    if (path.extname(file) === '.xml') {
      const filePath = path.join(outputDir, file);
    
      const workingDir = path.resolve(__dirname, `./results/${file}`);

      const resultFile = "AspectJResult";
      
      const bugLocatorFlags = `-b ${filePath} -s ${sourceCodeDir} -a ${alphaValue} -w ${workingDir} -n ${resultFile}`

      const command = `java -jar ${bugLocatorJar} ${bugLocatorFlags}`;

      const locusFlags = `-t all -r ${sourceCodeDir} -b ${filePath} -s ${sourceCodeDir} -w ${workingDir}`;

      const amalgamFlags = `-b ${filePath} -s ${sourceCodeDir} -g ${sourceCodeDir} -a ${alphaValue} -w ${workingDir} -n ${resultFile}`;

      const locusCommand = `java -jar ${locusJar} ${locusFlags}`;

      const bluirCommand = `java -jar ${bluirJar} ${bugLocatorFlags}`;

      const amalgamCommand = `java -jar ${amalgamJar} ${amalgamFlags}`;
      
      
      try {
       await gitController.commitCheckout(sourceCodeDir, filePath);
      await bugLocator.execCommand(command);

       await bugLocator.findAndReadTxtFiles(workingDir);

       await locus.execCommand(locusCommand);

       await locus.findAndReadTxtFiles(workingDir);

        await bluir.execCommand(bluirCommand);

        await bluir.findAndReadTxtFiles(workingDir);

        await amalgam.execCommand(amalgamCommand);

        await amalgam.findAndReadTxtFiles(workingDir);
        //console.log(`Output for ${file}:`, stdout);
      } catch (error) {
        console.error(`Error executing command for ${file}:`, error);
      }
    }
  }
}
const askQuestion = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => rl.question(query, (answer) => {
    rl.close();
    resolve(answer);
  }));
};

async function getInputs() {
  try {
    const bugInfoPath = await askQuestion("Enter the path to the bug info file: ");
    const bugInfoFile = path.resolve(bugInfoPath);

    const sourceCodePath = await askQuestion("Enter the path to the source code directory: ");
    const sourceCodeDir = path.resolve(sourceCodePath);

    const alphaInput = await askQuestion("Enter the alpha value: ");
    const alphaValue = parseFloat(alphaInput);

    console.log("Bug Info File Path:", bugInfoFile);
    console.log("Source Code Directory Path:", sourceCodeDir);
    console.log("Alpha Value:", alphaValue);

    return {bugInfoFile, sourceCodeDir, alphaValue};

  } catch (error) {
    console.error("Error:", error);
  }
}

const main = async ()=>{
  try{
    const {bugInfoFile, sourceCodeDir, alphaValue} = await getInputs();
    const parsedXML = await xmlParser.parseXML(bugInfoFile);
    const bugs = parsedXML.pma_xml_export.database[0].table;
    console.log(`Creating separate XML files for ${bugs.length} bugs...`);
    await xmlParser.createSeparateXMLFiles(bugs);
    console.log(`Separate XML files created. Running command for each file...`);
    await runCommandForEachFile(sourceCodeDir, alphaValue);
  //await execCommand(command);
  console.log("Bug locator completed execution");
  
  //await findAndReadTxtFiles(workingDir);
  }catch(error){
    console.error('An error occurred:', error);
  }

}

main();