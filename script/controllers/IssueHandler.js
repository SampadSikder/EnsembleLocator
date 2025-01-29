const path = require("path");
const fs = require("fs");
const readline = require("readline");
const git = require("../models/git.js");
const axios = require("axios");
const { Worker } = require("worker_threads");

const rankFormatter = require("./RankFormatter.js");

const bugLocatorJar = path.resolve(
  __dirname,
  "../../BugLocator/classes/buglocator.jar"
);

const locusJar = path.resolve(__dirname, "../../Locus_jar/Locus.jar");

const bluirJar = path.resolve(__dirname, "../../BLUiR_jar/BLUiR.jar");

const amalgamJar = path.resolve(__dirname, "../../AmaLgam_jar/AmaLgam.jar");

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
                clearDirectory(filePath)
                  .then(() => fs.rmdir(filePath, resolveFile))
                  .catch(rejectFile);
              } else {
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
          resolve();
        })
        .catch(reject);
    });
  });
}

async function runCommandForEachFile(sourceCodeDir, alphaValue, techniqueNum) {
  const outputDir = path.join(__dirname, "../BugReports");
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

            await locus.findAndReadTxtFiles(workingDir);

            continue;
          }
        }
      } catch (error) {
        console.error(`Error executing command for ${file}:`, error);
      }
    } else {
      console.error(`Invalid techniqueNum: ${techniqueNum}`);
    }
  }
}

async function handleConfig(req, res) {
  const gitRepoURL = req.body.gitRepoURL;
  const alphaValue = req.body.alphaValue;
  const techniqueNum = req.body.techniqueNum;
  const rankFusionType = req.body.rankFusionMethodNum;

  try {
    let bugHistoryFile = null;

    if (req.file) {
      bugHistoryFile = req.file.path;
    }
    const existingEntry = await git.findOne({ gitRepoURL });

    if (existingEntry) {
      return res.status(200).json({
        message: "Repository already exists",
        entry: existingEntry,
      });
    }

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
      rankFusionType,
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
    console.log(`Starting calculation...`);
    await xmlParser.createSingleXMLFile(bugsWithHistory);

    await xmlParser.createSingleXMLforLocus(bugsWithHistory);

    if (techniqueNum === 5) {
      await runCommandForEachFile(sourceCodeDir, alphaValue, 5);
      await runCommandForEachFile(sourceCodeDir, alphaValue, 2);
    } else {
      await runCommandForEachFile(sourceCodeDir, alphaValue, techniqueNum);
    }

    res.json(`Command ran result: `);
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

    const {
      sourceCodeDir,
      alphaValue,
      techniqueNum,
      bugHistoryFile,
      rankFusionType,
    } = existingEntry;

    const bugs = bugData.pma_xml_export.database.table;

    let bugsWithHistory = [...bugs]; // Initialize with existing bugs

    if (bugHistoryFile) {
      const parsedHistoryXML = await xmlParser.parseXML(bugHistoryFile);
      const historyBugs = parsedHistoryXML.pma_xml_export.database[0].table;

      if (Array.isArray(historyBugs) && historyBugs.length > 0) {
        bugsWithHistory = xmlParser.appendBug(bugs, historyBugs);
      }
    }

    await xmlParser.createSingleXMLFile(bugsWithHistory);
    await xmlParser.createSingleXMLforLocus(bugsWithHistory);

    console.log("Running algorithm...");

    const runCommandInThread = (techniqueNum) => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, "Worker.js"), {
          workerData: { sourceCodeDir, alphaValue, techniqueNum },
        });

        worker.on("message", (result) => {
          if (result.success)
            resolve(`Technique ${techniqueNum} executed successfully`);
          else reject(`Technique ${techniqueNum} failed: ${result.error}`);
        });

        worker.on("error", reject);
        worker.on("exit", (code) => {
          if (code !== 0) reject(`Worker stopped with exit code ${code}`);
        });
      });
    };

    const tasks = [];
    // Push techniques in thread
    if (techniqueNum === 5) {
      tasks.push(runCommandInThread(1));
      tasks.push(runCommandInThread(2));
      tasks.push(runCommandInThread(3));
      await Promise.all(tasks);
      // Before running Amalgam wait for others to finish
      await runCommandForEachFile(sourceCodeDir, alphaValue, 4);
    } else {
      await runCommandForEachFile(sourceCodeDir, alphaValue, techniqueNum);
    }

    console.log("Finished algorithm running fusion : " + rankFusionType);

    if (rankFusionType === 0 || rankFusionType === 1 || rankFusionType === 3) {
      console.log("Calculation Reciprocal Rank Fusion");
      const results = await rankFormatter.getTopRankedResults(
        path.join(__dirname, "../results"),
        bugId
      );

      const formattedResults = results.map((item) => ({
        rank: item.rank,
        doc: `${issueData.repository.html_url}/${item.doc}`,
        score: item.score,
      }));

      const responseMessage = formattedResults
        .map(
          (result) =>
            `Rank: ${result.rank}, File: [${result.doc}](${result.doc}), Score: ${result.score}`
        )
        .join("\n");

      console.log("Posting rank fusion in Github...");
      await postGitHubComment(
        issue.url,
        `Issue processed successfully. Here is the possible list of buggy files: \n\n${responseMessage}`
      );
    }
    if (rankFusionType === 2 || rankFusionType === 3) {
      console.log("Calculation LLM Rank Fusion");

      const llmResponse = await rankFormatter.getTopRankedResultsLLM(
        path.join(__dirname, "../results"),
        bugId
      );
      console.log("Posting LLM Fusion in Github...");
      await postGitHubComment(issue.url, `${llmResponse}`);
    }
  } catch (error) {
    console.error("Error processing issue request", error);
    await postGitHubComment(
      issue.url,
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

module.exports = {
  handleIssue,
  runCommandForEachFile,
  handleConfig,
  handleIssue2,
};
