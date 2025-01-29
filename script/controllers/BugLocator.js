const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const rankFormatter = require("./RankFormatter.js");
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
  await rankFormatter.processBuglocatorOutput(baseDirectory);
  try {
    const files = await fs.promises.readdir(baseDirectory);

    const unknownTextFolder = files.find((file) =>
      fs.statSync(path.join(baseDirectory, file)).isDirectory()
    );

    if (unknownTextFolder.startsWith("BugLocator")) {
      const recommendedDirectory = path.join(
        baseDirectory,
        unknownTextFolder,
        "recommended"
      );

      console.log(
        `Waiting for the recommended directory to be created: ${recommendedDirectory}`
      );

      await waitForDirectory(recommendedDirectory);

      console.log(`Recommended directory found: ${recommendedDirectory}`);

      const txtFiles = await fs.promises.readdir(recommendedDirectory);

      txtFiles.forEach((file) => {
        if (file.endsWith(".txt")) {
          const filePath = path.join(recommendedDirectory, file);

          // Print the file name
          console.log(`\ntxt file name: ${file}`);

          fs.readFile(filePath, "utf8", (err, content) => {
            if (err) {
              return console.error("Unable to read file:", err);
            }
            const lines = content.split("\n");
            const first10Lines = lines.slice(0, 10).join("\n");
            console.log(`First 10 lines of ${filePath}:\n${first10Lines}`);
          });
        }
      });
    } else {
      console.error("No unknown folder found");
    }
  } catch (err) {
    console.error("Error scanning directory:", err);
  }
};

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      if (stderr) {
        resolve(stderr);
        return;
      }

      resolve(stdout);
    });
  });
};

module.exports = {
  findAndReadTxtFiles,
  execCommand,
};
