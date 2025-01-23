const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");

function convertBluirTxtToCSV(inputFilePath, outputFilePath) {
  try {
    const inputText = fs.readFileSync(inputFilePath, "utf-8");

    // Process the input to convert it to CSV format
    const lines = inputText.trim().split("\n");
    const csvLines = lines.map((line) => {
      const parts = line.split(/\s+/); // Split by whitespace
      const className = parts[2]; // Class name is after Q0
      const rank = parts[3]; // Rank is next
      const score = parts[4]; // Score is next
      return `${className},${rank},${score}`;
    });

    const csvContent = csvLines.join("\n");
    fs.writeFileSync(outputFilePath, csvContent);

    console.log(`CSV file created successfully: ${outputFilePath}`);
  } catch (error) {
    console.error(`Error processing file ${inputFilePath}:`, error.message);
  }
}

function convertBuglocatorTxtToCSV(inputFilePath, outputFilePath) {
  try {
    // Read the content of the input file
    const inputText = fs.readFileSync(inputFilePath, "utf-8");

    // Process the input to convert it to CSV format
    const lines = inputText.trim().split("\n");
    const csvLines = lines.map((line) => {
      const parts = line.split("\t"); // Split by tab
      const rank = parts[0]; // Rank is the first column
      const score = parts[1]; // Score is the second column
      const className = parts[2]; // ClassName is the third column
      return `${className},${rank},${score}`;
    });

    // Join all lines and write to the output file
    const csvContent = csvLines.join("\n");
    fs.writeFileSync(outputFilePath, csvContent);

    console.log(`CSV file created successfully: ${outputFilePath}`);
  } catch (error) {
    console.error(`Error processing file ${inputFilePath}:`, error.message);
  }
}

function convertLocusTxtToCSV(inputFilePath, outputFilePath) {
  try {
    // Read the content of the input file
    const inputText = fs.readFileSync(inputFilePath, "utf-8");

    // Process the input to convert it to CSV format
    const lines = inputText.trim().split("\n");
    const csvLines = lines.map((line) => {
      const parts = line.split("\t"); // Split by tab
      const rank = parts[0]; // Rank is the first column
      const score = parts[1]; // Score is the second column
      const className = parts[2]; // ClassName is the third column
      return `${className},${rank},${score}`;
    });

    // Join all lines and write to the output file
    const csvContent = csvLines.join("\n");
    fs.writeFileSync(outputFilePath, csvContent);

    console.log(`CSV file created successfully: ${outputFilePath}`);
  } catch (error) {
    console.error(`Error processing file ${inputFilePath}:`, error.message);
  }
}

function processAllBuglocatorTxtFilesInDirectory(inputDir, outputDir) {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const files = fs.readdirSync(inputDir);

    files.forEach((file) => {
      if (path.extname(file) === ".txt") {
        const inputFilePath = path.join(inputDir, file);
        const outputFileName = `${path.basename(file, ".txt")}.csv`;
        const outputFilePath = path.join(outputDir, outputFileName);

        // Convert the txt file to csv
        convertBuglocatorTxtToCSV(inputFilePath, outputFilePath);
      }
    });

    console.log("All .txt files have been processed.");
  } catch (error) {
    console.error("Error processing directory:", error.message);
  }
}

function processAllLocusTxtFilesInDirectory(inputDir, outputDir) {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const files = fs.readdirSync(inputDir);

    files.forEach((file) => {
      if (path.extname(file) === ".txt") {
        const inputFilePath = path.join(inputDir, file);
        const outputFileName = `${path.basename(file, ".txt")}.csv`;
        const outputFilePath = path.join(outputDir, outputFileName);

        // Convert the txt file to csv
        convertLocusTxtToCSV(inputFilePath, outputFilePath);
      }
    });

    console.log("All .txt files have been processed.");
  } catch (error) {
    console.error("Error processing directory:", error.message);
  }
}

function processAllBluirTxtFilesInDirectory(inputDir, outputDir) {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const files = fs.readdirSync(inputDir);

    files.forEach((file) => {
      if (path.extname(file) === ".txt") {
        const inputFilePath = path.join(inputDir, file);
        const outputFileName = `${path.basename(file, ".txt")}.csv`;
        const outputFilePath = path.join(outputDir, outputFileName);

        // Convert the txt file to csv
        convertBluirTxtToCSV(inputFilePath, outputFilePath);
      }
    });

    console.log("All .txt files have been processed.");
  } catch (error) {
    console.error("Error processing directory:", error.message);
  }
}

// Function to parse a CSV file and return its contents as an array of objects
async function parseCSV(filePath) {
  const rows = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser({ headers: false }))
      .on("data", (row) => {
        const [file, rank, score] = Object.values(row);
        rows.push({ file, rank: parseInt(rank, 10), score: parseFloat(score) });
      })
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

// Function to get all CSV files from a directory and its subdirectories
async function getAllCSVFiles(folderPath) {
  let csvFiles = [];
  try {
    const entries = await fs.promises.readdir(folderPath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name);
      if (entry.isDirectory()) {
        try {
          const subDirFiles = await getAllCSVFiles(fullPath);
          csvFiles = csvFiles.concat(subDirFiles);
        } catch (subDirError) {
          console.warn(`Skipping inaccessible directory: ${fullPath}`);
        }
      } else if (entry.isFile() && entry.name.endsWith(".csv")) {
        csvFiles.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${folderPath}: ${error.message}`);
  }

  return csvFiles;
}

// Function to calculate Reciprocal Rank Fusion
async function reciprocalRankFusion(folderPath, bugID) {
  const csvFiles = await getAllCSVFiles(folderPath);

  // Filter for the specific bugID file
  const filteredFiles = csvFiles.filter(
    (file) => path.basename(file) === `${bugID}.csv`
  );

  if (filteredFiles.length === 0) {
    console.error(`No CSV file found for bugID: ${bugID}`);
    return [];
  }

  const documentScores = {};
  const k = 60;

  // Process the specific bugID file
  for (const file of filteredFiles) {
    const rows = await parseCSV(file);

    for (const row of rows) {
      const doc = row.file;
      const rank = row.rank;

      if (!documentScores[doc]) {
        documentScores[doc] = 0;
      }

      documentScores[doc] += 1 / (k + rank);
    }
  }

  // Convert the scores object to a sorted array
  const result = Object.entries(documentScores)
    .map(([doc, score]) => ({ doc, score }))
    .sort((a, b) => b.score - a.score); // Sort by score in descending order

  return result;
}

// Function to get top N results from RRF
async function getTopRankedResults(folderPath, bugID, topN = 10) {
  console.log("Reading csv files in: " + folderPath);
  const fusionResult = await reciprocalRankFusion(folderPath, bugID);
  return fusionResult.slice(0, topN);
}
async function processBluirOutput(baseDirectory) {
  const inputDirectory = path.join(baseDirectory, "BLUiR_Result/result"); // Replace with the path to your input directory
  const outputDirectory = path.join(baseDirectory, "BLUiR_Result/csv");
  processAllBluirTxtFilesInDirectory(inputDirectory, outputDirectory);
}

async function processBuglocatorOutput(baseDirectory) {
  const inputDirectory = path.join(
    baseDirectory,
    "BugLocator_Result/recommended"
  ); // Replace with the path to your input directory
  const outputDirectory = path.join(baseDirectory, "BugLocator_Result/csv");
  processAllBuglocatorTxtFilesInDirectory(inputDirectory, outputDirectory);
}

async function processLocusOutput(baseDirectory) {
  const inputDirectory = path.join(baseDirectory, "Locus/recommended"); // Replace with the path to your input directory
  const outputDirectory = path.join(baseDirectory, "Locus/csv");
  processAllLocusTxtFilesInDirectory(inputDirectory, outputDirectory);
}

module.exports = {
  processBluirOutput,
  processBuglocatorOutput,
  processLocusOutput,
  getTopRankedResults,
};
