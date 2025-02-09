const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { axios } = require("axios");

// Initialize OpenAI API
// const openai = new OpenAI({
//   baseURL: "https://api.deepseek.com",
//   apiKey: process.env.DEEPSEEK_API_KEY,
// });

function convertBluirTxtToCSV(inputFilePath, outputFilePath) {
  try {
    const inputText = fs.readFileSync(inputFilePath, "utf-8");

    // Process the input to convert it to CSV format
    const lines = inputText.trim().split("\n");
    const csvLines = lines.map((line) => {
      const parts = line.split(/\s+/);
      const className = parts[2];
      const rank = parts[3];
      const score = parts[4];
      return `${className},${rank},${score}`;
    });

    const csvContent = csvLines.join("\n");
    fs.writeFileSync(outputFilePath, csvContent);
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
      const parts = line.split("\t");
      const rank = parts[0];
      const score = parts[1];
      const className = parts[2];
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
      const parts = line.split("\t");
      const rank = parts[0];
      const score = parts[1];
      const className = parts[2];
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
  const k = 40;

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

async function LLMRankFusion(folderPath, bugID) {
  const csvFiles = await getAllCSVFiles(folderPath);
  let promptString = "";
  const topEntries = 20;

  const filteredFiles = csvFiles.filter(
    (file) => path.basename(file) === `${bugID}.csv`
  );

  if (filteredFiles.length === 0) {
    console.error(`No CSV file found for bugID: ${bugID}`);
    return [];
  }

  for (const file of filteredFiles) {
    const rows = await parseCSV(file);

    promptString += `File: ${path.basename(file)}\n`;
    rows.slice(0, topEntries).forEach((row) => {
      promptString += `${row.file}, ${row.rank}, ${row.score}\n`;
    });
    promptString += "\n";
  }
  promptString +=
    "Find the most common top 10 between these files. The file structure is file name, rank, score. Format the structured output as a list of files. For each file, include\n- File name\n- rank\n- score";

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  result = await model.generateContent(promptString);
  const responseText = result.response.text();
  return responseText;
}

async function formatResponse(response) {
  const langsmithEndpoint = "https://api.smith.langchain.com";
  const apiKey = process.env.LANGSMITH_API_KEY;

  try {
    // Define the payload
    const payload = {
      model: "gpt-3.5-turbo",
      input: response,
      instructions: `Format the output as a structured list of files. For each file, include:
      - File name
      - Any associated metadata (if available)
      - Description of the file's contents.`,
    };

    // Send the API request
    const responseText = await axios.post(langsmithEndpoint, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    // Handle the response
    const formattedOutput = responseText.data.output; // Adjust based on LangSmith's API response structure
    return formattedOutput;
  } catch (error) {
    console.error(
      "Error calling LangSmith API:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Function to get top N results from RRF
async function getTopRankedResults(folderPath, bugID, topN = 10) {
  console.log("Reading csv files in: " + folderPath);
  const fusionResult = await reciprocalRankFusion(folderPath, bugID);
  return fusionResult.slice(0, topN).map((item, index) => ({
    rank: index + 1,
    doc: item.doc,
    score: item.score,
  }));
}

async function getTopRankedResultsLLM(folderPath, bugID) {
  console.log("Reading csv files in: " + folderPath);
  const fusionResult = await LLMRankFusion(folderPath, bugID);
  return fusionResult;
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
  getTopRankedResultsLLM,
  formatResponse,
};
