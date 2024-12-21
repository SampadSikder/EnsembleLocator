const fs = require('fs');
const path = require('path');
function convertBluirTxtToCSV(inputFilePath, outputFilePath) {
    try {
        const inputText = fs.readFileSync(inputFilePath, 'utf-8');
        
        // Process the input to convert it to CSV format
        const lines = inputText.trim().split('\n');
        const csvLines = lines.map(line => {
            const parts = line.split(/\s+/); // Split by whitespace
            const className = parts[2]; // Class name is after Q0
            const rank = parts[3]; // Rank is next
            const score = parts[4]; // Score is next
            return `${className},${rank},${score}`;
        });

        const csvContent = csvLines.join('\n');
        fs.writeFileSync(outputFilePath, csvContent);

        console.log(`CSV file created successfully: ${outputFilePath}`);
    } catch (error) {
        console.error(`Error processing file ${inputFilePath}:`, error.message);
    }
}


function convertBuglocatorTxtToCSV(inputFilePath, outputFilePath) {
    try {
        // Read the content of the input file
        const inputText = fs.readFileSync(inputFilePath, 'utf-8');

        // Process the input to convert it to CSV format
        const lines = inputText.trim().split('\n');
        const csvLines = lines.map(line => {
            const parts = line.split('\t'); // Split by tab
            const rank = parts[0];         // Rank is the first column
            const score = parts[1];        // Score is the second column
            const className = parts[2];    // ClassName is the third column
            return `${className},${rank},${score}`;
        });

        // Join all lines and write to the output file
        const csvContent = csvLines.join('\n');
        fs.writeFileSync(outputFilePath, csvContent);

        console.log(`CSV file created successfully: ${outputFilePath}`);
    } catch (error) {
        console.error(`Error processing file ${inputFilePath}:`, error.message);
    }
}

function convertLocusTxtToCSV(inputFilePath, outputFilePath) {
    try {
        // Read the content of the input file
        const inputText = fs.readFileSync(inputFilePath, 'utf-8');

        // Process the input to convert it to CSV format
        const lines = inputText.trim().split('\n');
        const csvLines = lines.map(line => {
            const parts = line.split('\t'); // Split by tab
            const rank = parts[0];         // Rank is the first column
            const score = parts[1];        // Score is the second column
            const className = parts[2];    // ClassName is the third column
            return `${className},${rank},${score}`;
        });

        // Join all lines and write to the output file
        const csvContent = csvLines.join('\n');
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

        files.forEach(file => {
            if (path.extname(file) === '.txt') {
                const inputFilePath = path.join(inputDir, file);
                const outputFileName = `${path.basename(file, '.txt')}.csv`;
                const outputFilePath = path.join(outputDir, outputFileName);

                // Convert the txt file to csv
                convertBuglocatorTxtToCSV(inputFilePath, outputFilePath);
            }
        });

        console.log('All .txt files have been processed.');
    } catch (error) {
        console.error('Error processing directory:', error.message);
    }
}

function processAllLocusTxtFilesInDirectory(inputDir, outputDir) {
    try {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const files = fs.readdirSync(inputDir);

        files.forEach(file => {
            if (path.extname(file) === '.txt') {
                const inputFilePath = path.join(inputDir, file);
                const outputFileName = `${path.basename(file, '.txt')}.csv`;
                const outputFilePath = path.join(outputDir, outputFileName);

                // Convert the txt file to csv
                convertLocusTxtToCSV(inputFilePath, outputFilePath);
            }
        });

        console.log('All .txt files have been processed.');
    } catch (error) {
        console.error('Error processing directory:', error.message);
    }
}

function processAllBluirTxtFilesInDirectory(inputDir, outputDir) {
    try {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const files = fs.readdirSync(inputDir);

        files.forEach(file => {
            if (path.extname(file) === '.txt') {
                const inputFilePath = path.join(inputDir, file);
                const outputFileName = `${path.basename(file, '.txt')}.csv`;
                const outputFilePath = path.join(outputDir, outputFileName);

                // Convert the txt file to csv
                convertBluirTxtToCSV(inputFilePath, outputFilePath);
            }
        });

        console.log('All .txt files have been processed.');
    } catch (error) {
        console.error('Error processing directory:', error.message);
    }
}

async function processBluirOutput(baseDirectory){
    const inputDirectory = path.join(baseDirectory, "BLUiR_Result/result"); // Replace with the path to your input directory
    const outputDirectory = path.join(baseDirectory, "BLUiR_Result/csv"); 
    processAllBluirTxtFilesInDirectory(inputDirectory, outputDirectory);
}

async function processBuglocatorOutput(baseDirectory){
    const inputDirectory = path.join(baseDirectory, "BugLocator_Result/recommended"); // Replace with the path to your input directory
    const outputDirectory = path.join(baseDirectory, "BugLocator_Result/csv"); 
    processAllBuglocatorTxtFilesInDirectory(inputDirectory, outputDirectory);
}


async function processLocusOutput(baseDirectory){
    const inputDirectory = path.join(baseDirectory, "Locus/recommended"); // Replace with the path to your input directory
    const outputDirectory = path.join(baseDirectory, "Locus/csv"); 
    processAllLocusTxtFilesInDirectory(inputDirectory, outputDirectory);
}

module.exports={
    processBluirOutput,
    processBuglocatorOutput,
    processLocusOutput
}