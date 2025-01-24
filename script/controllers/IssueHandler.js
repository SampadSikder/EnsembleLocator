const path = require("path");
const fs = require("fs");
const readline = require("readline");
const git = require("../models/git.js");
const axios = require("axios");

const rankFormatter = require("./RankFormatter.js");

const bugLocatorJar = path.resolve(
  __dirname,
  "../../BugLocator/classes/buglocator.jar"
);

const locusJar = path.resolve(__dirname, "../../Locus_jar/Locus.jar");

const bluirJar = path.resolve(__dirname, "../../BLUiR_jar/BLUiR.jar");

const amalgamJar = path.resolve(__dirname, "../../AmaLgam_jar/AmaLgam.jar");

// const bugInfoFile = path.resolve("/mnt/c/Users/BS01319/Documents/EnsembleLocator/bug2.xml");

// const sourceCodeDir = path.resolve("/mnt/c/Users/BS01319/Documents/AspectJ/gitrepo");

// const alphaValue = 0.2;

const xmlParser = require("./XMLParserAndBuilder.js");

const bugLocator = require("./BugLocator.js");

const locus = require("./Locus.js");

const gitController = require("./GitController.js");

const bluir = require("./BLUiR.js");

const amalgam = require("./AmaLgam.js");
function clearDirectory(directory) {
  return new Promise((resolve, reject) => {
    fs.readdir(directory, (err, files) => {
      if (err) {
        if (err.code === "ENOENT") {
          console.log(`Directory does not exist: ${directory}`);
          return resolve();
        }
        return reject(err);
      }

      Promise.all(
        files.map((file) => {
          const filePath = path.join(directory, file);

          return new Promise((resolveFile, rejectFile) => {
            fs.stat(filePath, (statErr, stats) => {
              if (statErr) return rejectFile(statErr);

              if (stats.isDirectory()) {
                // For directories, clear contents first then remove directory
                clearDirectory(filePath)
                  .then(() => fs.rmdir(filePath, resolveFile))
                  .catch(rejectFile);
              } else {
                // For files, simply unlink
                fs.unlink(filePath, (unlinkErr) => {
                  if (unlinkErr) rejectFile(unlinkErr);
                  else resolveFile();
                });
              }
            });
          });
        })
      )
        .then(() => {
          console.log(`Cleared directory: ${directory}`);
          resolve();
        })
        .catch(reject);
    });
  });
}

async function runCommandForEachFile(sourceCodeDir, alphaValue, techniqueNum) {
  const outputDir = path.join(__dirname, "../BugReports");
  //console.log(sourceCodeDir + ' ' + alphaValue + ' ' + techniqueNum);
  const files = await fs.promises.readdir(outputDir);
  let locusFlag = false;
  for (const file of files) {
    if (file.startsWith("locus")) {
      locusFlag = true;
    } else {
      locusFlag = false;
    }
    if (path.extname(file) === ".xml" && file.startsWith) {
      const filePath = path.join(outputDir, file);

      const workingDir = path.resolve(__dirname, `../results/${file}`);

      const outputLogDir = path.resolve(
        __dirname,
        `../Logs/${techniqueNum}.txt`
      );

      const resultFile = "Result";

      const locusWorkingDir = path.join(workingDir, "./Locus");

      const bugLocatorFlags = `-b ${filePath} -s ${sourceCodeDir} -a ${alphaValue} -w ${workingDir} -n ${resultFile} > ${outputLogDir} `;

      const command = `java -jar ${bugLocatorJar} ${bugLocatorFlags}`;

      const locusFlags = `-t all -r ${sourceCodeDir} -b ${filePath} -s ${sourceCodeDir} -w ${locusWorkingDir} > ${outputLogDir}`;

      const amalgamFlags = `-b ${filePath} -s ${sourceCodeDir} -g ${sourceCodeDir} -a ${alphaValue} -w ${workingDir} -n ${resultFile} > ${outputLogDir}`;

      const locusCommand = `java -jar ${locusJar} ${locusFlags}`;

      const bluirCommand = `java -jar ${bluirJar} ${bugLocatorFlags}`;

      const amalgamCommand = `java -jar ${amalgamJar} ${amalgamFlags}`;

      try {
        if (locusFlag == false) {
          //await gitController.commitCheckout(sourceCodeDir, filePath);
          if (techniqueNum === 1) {
            await bugLocator.execCommand(command);
            await bugLocator.findAndReadTxtFiles(workingDir);
          } else if (techniqueNum === 3) {
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
        } else {
          if (techniqueNum === 2) {
            await locus.execCommand(locusCommand);

            //await locus.findAndReadTxtFiles(workingDir);

            continue;
          }
        }
      } catch (error) {
        console.error(`Error executing command for ${file}:`, error);
      }
    } else {
      console.error(`Invalid techniqueNum: ${techniqueNum}`);
    }

    //console.log(`Output for ${file}:`, stdout);
  }
}

async function handleConfig(req, res) {
  const gitRepoURL = req.body.gitRepoURL;
  const alphaValue = req.body.alphaValue;
  const techniqueNum = req.body.techniqueNum;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const bugHistoryFile = req.file.path;
    // Check if an entry with the same gitRepoURL already exists
    const existingEntry = await git.findOne({ gitRepoURL });

    if (existingEntry) {
      return res.status(200).json({
        message: "Repository already exists",
        entry: existingEntry,
      });
    }

    // If no existing entry found, proceed with cloning and creating new entry
    const sourceCodeDir = await gitController.cloneRepo(
      gitRepoURL,
      "../Repositories"
    );

    const configEntry = new git({
      gitRepoURL,
      alphaValue,
      techniqueNum,
      bugHistoryFile,
      sourceCodeDir,
    });

    await configEntry.save();
    res.status(201).json(configEntry);
  } catch (err) {
    res.status(500).json({
      message: "Error processing request",
      error: err.message,
    });
  }
}

async function handleIssue(req, res) {
  const dirPath = path.join(__dirname, "../results");
  await clearDirectory(dirPath);

  const gitRepoURL = req.body.gitRepoURL;

  try {
    const existingEntry = await git.findOne({ gitRepoURL });
    console.log(existingEntry);
    if (!existingEntry) {
      return res.status(500).json({
        message: "Repository is not configured! Please configure it",
      });
    }

    const sourceCodeDir = existingEntry.sourceCodeDir;
    const alphaValue = existingEntry.alphaValue;
    const techniqueNum = existingEntry.techniqueNum;
    const bugHistoryFile = existingEntry.bugHistoryFile;
    const bugInfoFile = req.body.bugInfoFile;

    const parsedXML = await xmlParser.parseXML(bugInfoFile);
    const bugs = parsedXML.pma_xml_export.database[0].table;
    const parsedHistoryXML = await xmlParser.parseXML(bugHistoryFile);
    const historyBugs = parsedHistoryXML.pma_xml_export.database[0].table;
    const bugsWithHistory = xmlParser.appendBug(bugs, historyBugs);
    console.log(
      `Creating separate XML files for ${bugs.length} bugs with ${historyBugs.length} history bugs....`
    );
    await xmlParser.createSingleXMLFile(bugsWithHistory);
    console.log(
      `Separate XML files for Locus for ${bugs.length} bugs with ${historyBugs.length} history bugs....`
    );
    await xmlParser.createSingleXMLforLocus(bugsWithHistory);
    console.log(`Separate XML files created. Running command for each file...`);

    if (techniqueNum === 5) {
      await runCommandForEachFile(sourceCodeDir, alphaValue, 5);
      await runCommandForEachFile(sourceCodeDir, alphaValue, 2);
    } else {
      await runCommandForEachFile(sourceCodeDir, alphaValue, techniqueNum);
    }

    res.json(`Command ran result: `);
    //await execCommand(command);
  } catch (e) {
    console.error("Error processing issue request", e);
    res.status(500).json({
      message: "Error processing issue request",
      error: e.message,
    });
  }
}

function convertIssueURLToRepoURL(issueURL) {
  const repoURL = issueURL.split("/issues/")[0] + ".git";
  return repoURL;
}

async function postGitHubComment(issueUrl, message) {
  await axios.post(
    `${issueUrl}/comments`,
    {
      body: message,
    },
    {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

async function processIssue(issueData) {
  const bugId = Math.floor(Date.now() / 1000);
  const issue = issueData.issue;

  try {
    const latestCommitId = await gitController.getLatestCommitId(
      issueData.sender.login,
      issueData.repository.name,
      "main"
    );

    const bugData = await xmlParser.convertIssueToXML(
      bugId,
      issue,
      latestCommitId
    );
    const dirPath = path.join(__dirname, "../results");
    await clearDirectory(dirPath);

    const gitRepoURL = convertIssueURLToRepoURL(issue.html_url);
    const existingEntry = await git.findOne({ gitRepoURL });

    if (!existingEntry) {
      await postGitHubComment(
        issue.html_url,
        "Error: Repository is not configured! Please configure it."
      );
      return;
    }

    const { sourceCodeDir, alphaValue, techniqueNum, bugHistoryFile } =
      existingEntry;

    const bugs = bugData.pma_xml_export.database.table;
    const parsedHistoryXML = await xmlParser.parseXML(bugHistoryFile);
    const historyBugs = parsedHistoryXML.pma_xml_export.database[0].table;
    const bugsWithHistory = xmlParser.appendBug(bugs, historyBugs);

    await xmlParser.createSingleXMLFile(bugsWithHistory);
    await xmlParser.createSingleXMLforLocus(bugsWithHistory);

    console.log("Running algorithm...");

    if (techniqueNum === 5) {
      await runCommandForEachFile(sourceCodeDir, alphaValue, 5);
      await runCommandForEachFile(sourceCodeDir, alphaValue, 2);
    } else {
      await runCommandForEachFile(sourceCodeDir, alphaValue, techniqueNum);
    }

    const results = await rankFormatter.getTopRankedResults(
      path.join(__dirname, "../results"),
      bugId
    );

    const formattedResults = results.map((item) => ({
      rank: item.rank,
      doc: item.doc,
      score: item.score,
    }));

    const responseMessage = formattedResults
      .map((result) => `Doc: ${result.doc}, Score: ${result.score}`)
      .join("\n");

    await postGitHubComment(
      issue.url,
      `Issue processed successfully. Here is the possible list of buggy files: \n\n${responseMessage}`
    );
  } catch (error) {
    console.error("Error processing issue request", error);
    await postGitHubComment(
      issue.html_url,
      "Error processing the issue. Please check logs for details."
    );
  }
}

async function handleIssue2(req, res) {
  const eventType = req.body.action;

  if (eventType !== "opened") {
    return res.status(400).json({ message: "Invalid event type" });
  }

  res.json({
    message: "Webhook received successfully, processing in the background...",
  });

  // Proceed asynchronously
  processIssue(req.body).catch((error) =>
    console.error("Error processing issue:", error)
  );
}

// async function handleIssue2(req, res) {
//   const eventType = req.body.action;

//   if (eventType !== "opened") {
//     return res.status(500).json({ message: "Invalid event type" });
//   }
//   try {
//     res.json({
//       message: "Webhook received successfully, please wait for result....",
//     });
//     const bugId = Math.floor(Date.now() / 1000);
//     const issue = req.body.issue;

//     const latestCommitId = await gitController.getLatestCommitId(
//       req.body.sender.login,
//       req.body.repository.name,
//       "main"
//     );
//     console.log(latestCommitId);
//     const bugData = await xmlParser.convertIssueToXML(
//       bugId,
//       issue,
//       latestCommitId
//     );
//     const dirPath = path.join(__dirname, "../results");
//     await clearDirectory(dirPath);

//     console.log(bugData);

//     const gitRepoURL = convertIssueURLToRepoURL(issue.html_url);
//     const existingEntry = await git.findOne({ gitRepoURL });

//     if (!existingEntry) {
//       return res
//         .status(400)
//         .json({ message: "Repository is not configured! Please configure it" });
//     }

//     const { sourceCodeDir, alphaValue, techniqueNum, bugHistoryFile } =
//       existingEntry;

//     const bugs = bugData.pma_xml_export.database.table;
//     const parsedHistoryXML = await xmlParser.parseXML(bugHistoryFile);
//     const historyBugs = parsedHistoryXML.pma_xml_export.database[0].table;
//     const bugsWithHistory = xmlParser.appendBug(bugs, historyBugs);

//     await xmlParser.createSingleXMLFile(bugsWithHistory);
//     await xmlParser.createSingleXMLforLocus(bugsWithHistory);

//     console.log("Running algorithm!");

//     if (techniqueNum === 5) {
//       await runCommandForEachFile(sourceCodeDir, alphaValue, 5);
//       await runCommandForEachFile(sourceCodeDir, alphaValue, 2);
//     } else {
//       await runCommandForEachFile(sourceCodeDir, alphaValue, techniqueNum);
//     }

//     const results = await rankFormatter.getTopRankedResults(
//       path.join(__dirname, "../results"),
//       bugId
//     );

//     const formattedResults = results.map((item) => ({
//       rank: item.rank,
//       doc: item.doc,
//       score: item.score,
//     }));

//     // res.json({
//     //   message: "Command ran successfully",
//     //   results: formattedResults,
//     // });

//     const responseMessage = formattedResults
//       .map(
//         (result) =>
//           `Rank: ${result.rank}, Doc: ${result.doc}, Score: ${result.score}`
//       )
//       .join("\n");

//     await postGitHubComment(
//       issue.html_url,
//       `Issue processed successfully.\n\n${responseMessage}`
//     );
//   } catch (error) {
//     console.error("Error processing issue request", error);
//     res.status(500).json({
//       message: "Error processing issue request",
//       error: error.message,
//     });
//   }
// }

module.exports = {
  handleIssue,
  runCommandForEachFile,
  handleConfig,
  handleIssue2,
};
