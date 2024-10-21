const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

app.use(cors());
app.use(express.json());

const bugLocatorJar = path.resolve(__dirname, '../BugLocator/classes/buglocator.jar');

const locusJar = path.resolve(__dirname, '../Locus_jar/Locus.jar');

const bugInfoFile = path.resolve("/mnt/c/Users/BS01319/Documents/EnsembleLocator/bug2.xml");

const sourceCodeDir = path.resolve("/mnt/c/Users/BS01319/Documents/AspectJ/gitrepo");

const alphaValue = 0.2;

const xmlParser = require('./controllers/XMLParserAndBuilder.js');

const bugLocator = require('./controllers/BugLocator.js');

const locus = require('./controllers/Locus.js');

const gitController = require('./controllers/GitController.js');

async function runCommandForEachFile() {
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

      const locusCommand = `java -jar ${locusJar} ${locusFlags}`;
      
      
      try {
        await gitController.commitCheckout(sourceCodeDir, filePath);
        await bugLocator.execCommand(command);

        await bugLocator.findAndReadTxtFiles(workingDir);

        await locus.execCommand(locusCommand);

        await locus.findAndReadTxtFiles(workingDir);
        //console.log(`Output for ${file}:`, stdout);
      } catch (error) {
        console.error(`Error executing command for ${file}:`, error);
      }
    }
  }
}


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