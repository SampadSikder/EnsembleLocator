const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

app.use(cors());
app.use(express.json());

const routes = require('./routes/route.js');
app.use("/", routes);

const port = 8080;



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

async function runCommandForEachFile(sourceCodeDir, alphaValue, techniqueNum) {
  const outputDir = path.join(__dirname, './BugReports');

  const files = await fs.promises.readdir(outputDir);
  let locusFlag = false;
  for (const file of files) {
    if (file.startsWith('locus')) {
      locusFlag = true;
    }else{
      locusFlag = false;
    }
    if (path.extname(file) === '.xml' && file.startsWith) {
      const filePath = path.join(outputDir, file);

      const workingDir = path.resolve(__dirname, `./results/${file}`);

      const outputLogDir = path.resolve(__dirname, `./Logs/${techniqueNum}.txt`);

      const resultFile = "Result";

      const locusWorkingDir = path.join(workingDir, "./Locus");
      
      const bugLocatorFlags = `-b ${filePath} -s ${sourceCodeDir} -a ${alphaValue} -w ${workingDir} -n ${resultFile} > ${outputLogDir} `

      const command = `java -jar ${bugLocatorJar} ${bugLocatorFlags}`;

      const locusFlags = `-t all -r ${sourceCodeDir} -b ${filePath} -s ${sourceCodeDir} -w ${locusWorkingDir} > ${outputLogDir}`;

      const amalgamFlags = `-b ${filePath} -s ${sourceCodeDir} -g ${sourceCodeDir} -a ${alphaValue} -w ${workingDir} -n ${resultFile} > ${outputLogDir}`;

      const locusCommand = `java -jar ${locusJar} ${locusFlags}`;

      const bluirCommand = `java -jar ${bluirJar} ${bugLocatorFlags}`;

      const amalgamCommand = `java -jar ${amalgamJar} ${amalgamFlags}`;
      
      try {
       if(locusFlag == false){
          //await gitController.commitCheckout(sourceCodeDir, filePath);
          if (techniqueNum === 1) {
            await bugLocator.execCommand(command);
            await bugLocator.findAndReadTxtFiles(workingDir);
          }else if (techniqueNum === 3) {
            await bluir.execCommand(bluirCommand);
            await bluir.findAndReadTxtFiles(workingDir);
          } else if (techniqueNum === 4) {
            await amalgam.execCommand(amalgamCommand);
            await amalgam.findAndReadTxtFiles(workingDir);
          } else if (techniqueNum === 5) {
              await bugLocator.execCommand(command);
    
              await bugLocator.findAndReadTxtFiles(workingDir);
              
              await bluir.execCommand(bluirCommand);
     
              await bluir.findAndReadTxtFiles(workingDir);
      
              await amalgam.execCommand(amalgamCommand);
      
              await amalgam.findAndReadTxtFiles(workingDir);
              
              continue;
            }
        }
     else{
          if(techniqueNum === 2) {
          await locus.execCommand(locusCommand);
 
          await locus.findAndReadTxtFiles(workingDir);
          
          continue;
          }
        }
      
      }
      catch (error) {
      console.error(`Error executing command for ${file}:`, error);
    }
      } else {
        console.error(`Invalid techniqueNum: ${techniqueNum}`);
      }
      
 
        //console.log(`Output for ${file}:`, stdout);
     
    }
  }

// const askQuestion = (query) => {
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
//   });

//   return new Promise((resolve) => rl.question(query, (answer) => {
//     rl.close();
//     resolve(answer);
//   }));
// };

// async function getInputs() {
//   try {
//     const bugInfoPath = await askQuestion("Enter the path to the bug info file: ");
//     const bugInfoFile = path.resolve(bugInfoPath);

//     const bugHistoryPath = await askQuestion("Enter the path to the bug history file: ");
//     const bugHistoryFile = path.resolve(bugHistoryPath);

//     const sourceCodePath = await askQuestion("Enter the path to the source code directory: ");
//     const sourceCodeDir = path.resolve(sourceCodePath);

//     const alphaInput = await askQuestion("Enter the alpha value: ");
//     const alphaValue = parseFloat(alphaInput);

//     const techniqueName = await askQuestion("Enter the technique number:\n1. BugLocator\n2. Locus\n3. BLUiR \n 5.All");
//     const techniqueNum = parseInt(techniqueName);

//     console.log("Bug Info File Path:", bugInfoFile);
//     console.log("Source Code Directory Path:", sourceCodeDir);
//     console.log("Alpha Value:", alphaValue);
//     console.log("techniqueNum:", techniqueNum);

//     return {bugInfoFile, bugHistoryFile, sourceCodeDir, alphaValue, techniqueNum};

//   } catch (error) {
//     console.error("Error:", error);
//   }
// }
async function getInputsFromArgs() {
  const args = process.argv.slice(2);
  const inputs = {
    bugInfoFile: null,
    bugHistoryFile: null,
    sourceCodeDir: null,
    alphaValue: null,
    techniqueNum: null
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "-b":
        inputs.bugInfoFile = path.resolve(args[++i]);
        break;
      case "-h":
        inputs.bugHistoryFile = path.resolve(args[++i]);
        break;
      case "-s":
        inputs.sourceCodeDir = path.resolve(args[++i]);
        break;
      case "-a":
        inputs.alphaValue = parseFloat(args[++i]);
        break;
      case "-t":
        inputs.techniqueNum = parseInt(args[++i]);
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
    }
  }

  if (!inputs.bugInfoFile || !inputs.bugHistoryFile || !inputs.sourceCodeDir || inputs.alphaValue === null || inputs.techniqueNum === null) {
    console.error("Missing required arguments. Usage:");
    console.error("node script.js -b <bugInfoFile> -h <bugHistoryFile> -s <sourceCodeDir> -a <alphaValue> -t <techniqueNum :\n1. BugLocator\n2. Locus\n3. BLUiR \n 5.All>");
    process.exit(1);
  }

  console.log("Bug Info File Path:", inputs.bugInfoFile);
  console.log("Bug History File Path:", inputs.bugHistoryFile);
  console.log("Source Code Directory Path:", inputs.sourceCodeDir);
  console.log("Alpha Value:", inputs.alphaValue);
  console.log("Technique Number:", inputs.techniqueNum);

  return {
    bugInfoFile: inputs.bugInfoFile,
    bugHistoryFile: inputs.bugHistoryFile,
    sourceCodeDir: inputs.sourceCodeDir,
    alphaValue: inputs.alphaValue,
    techniqueNum: inputs.techniqueNum
  };
}


const main = async ()=>{
  try{
    // const {bugInfoFile, bugHistoryFile, sourceCodeDir, alphaValue, techniqueNum} = await getInputsFromArgs();
    // const parsedXML = await xmlParser.parseXML(bugInfoFile);
    // const bugs = parsedXML.pma_xml_export.database[0].table;
    // const parsedHistoryXML = await xmlParser.parseXML(bugHistoryFile);
    // const historyBugs = parsedHistoryXML.pma_xml_export.database[0].table;
    // const bugsWithHistory = xmlParser.appendBug(bugs, historyBugs);
    // console.log(`Creating separate XML files for ${bugs.length} bugs with ${historyBugs.length} history bugs....`);
    // await xmlParser.createSingleXMLFile(bugsWithHistory);
    // console.log(`Separate XML files for Locus for ${bugs.length} bugs with ${historyBugs.length} history bugs....`);
    // await xmlParser.createSingleXMLforLocus(bugsWithHistory);
    // console.log(`Separate XML files created. Running command for each file...`);
    // await runCommandForEachFile(sourceCodeDir, alphaValue, techniqueNum);

    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    })
  //await execCommand(command);
  
  //await findAndReadTxtFiles(workingDir);
  }catch(error){
    console.error('An error occurred:', error);
  }

}

main();