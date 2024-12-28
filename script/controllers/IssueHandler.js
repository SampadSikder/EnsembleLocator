const path = require('path');
const fs = require('fs');
const readline = require('readline');

const bugLocatorJar = path.resolve(__dirname, '../../BugLocator/classes/buglocator.jar');

const locusJar = path.resolve(__dirname, '../../Locus_jar/Locus.jar');

const bluirJar = path.resolve(__dirname, '../../BLUiR_jar/BLUiR.jar');

const amalgamJar = path.resolve(__dirname, '../../AmaLgam_jar/AmaLgam.jar');

// const bugInfoFile = path.resolve("/mnt/c/Users/BS01319/Documents/EnsembleLocator/bug2.xml");

// const sourceCodeDir = path.resolve("/mnt/c/Users/BS01319/Documents/AspectJ/gitrepo");

// const alphaValue = 0.2;

const xmlParser = require('./XMLParserAndBuilder.js');

const bugLocator = require('./BugLocator.js');

const locus = require('./Locus.js');

const gitController = require('./GitController.js');

const bluir = require('./BLUiR.js');

const amalgam = require('./AmaLgam.js');

async function runCommandForEachFile(sourceCodeDir, alphaValue, techniqueNum) {
    const outputDir = path.join(__dirname, '../BugReports');
  
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
  
        const workingDir = path.resolve(__dirname, `../results/${file}`);
  
        const outputLogDir = path.resolve(__dirname, `../Logs/${techniqueNum}.txt`);
  
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
  

    async function handleIssue(req, res){
        const sourceCodeDir = req.body.sourceCodeDir;
        const bugInfoFile = req.body.bugInfoFile;
        const bugHistoryFile = req.body.bugHistoryFile;
        const alphaValue = req.body.alphaValue;
        const techniqueNum = req.body.techniqueNum;


        const parsedXML = await xmlParser.parseXML(bugInfoFile);
        const bugs = parsedXML.pma_xml_export.database[0].table;
        const parsedHistoryXML = await xmlParser.parseXML(bugHistoryFile);
        const historyBugs = parsedHistoryXML.pma_xml_export.database[0].table;
        const bugsWithHistory = xmlParser.appendBug(bugs, historyBugs);
        console.log(`Creating separate XML files for ${bugs.length} bugs with ${historyBugs.length} history bugs....`);
        await xmlParser.createSingleXMLFile(bugsWithHistory);
        console.log(`Separate XML files for Locus for ${bugs.length} bugs with ${historyBugs.length} history bugs....`);
        await xmlParser.createSingleXMLforLocus(bugsWithHistory);
        console.log(`Separate XML files created. Running command for each file...`);
        await runCommandForEachFile(sourceCodeDir, alphaValue, techniqueNum);

        res.json(`Command ran result: `);
      //await execCommand(command);
    }



module.exports = {
    handleIssue,
    runCommandForEachFile
}