const path = require("path");
const fs = require("fs");
const xml2js = require("xml2js");

const outputDir = path.join(__dirname, "../BugReports");

function parseXML(filePath) {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to read file: ${filePath}`);
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        console.error(`Error reading file ${filePath}:`, err);
        return reject(err);
      }
      console.log(`File read successfully. Parsing XML...`);
      const parser = new xml2js.Parser();
      parser.parseString(data, (parseErr, result) => {
        if (parseErr) {
          console.error(`Error parsing XML:`, parseErr);
          return reject(parseErr);
        }
        console.log(`XML parsed successfully.`);
        resolve(result);
      });
    });
  });
}

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
        files.map(
          (file) =>
            new Promise((resolveUnlink, rejectUnlink) => {
              fs.unlink(path.join(directory, file), (unlinkErr) => {
                if (unlinkErr) rejectUnlink(unlinkErr);
                else resolveUnlink();
              });
            })
        )
      )
        .then(() => {
          console.log(`Cleared directory: ${directory}`);
          resolve();
        })
        .catch(reject);
    });
  });
}

function createSeparateXMLFiles(bugs) {
  return new Promise((resolve, reject) => {
    fs.mkdir(outputDir, { recursive: true }, async (mkdirErr) => {
      if (mkdirErr) {
        return reject(mkdirErr);
      }

      try {
        await clearDirectory(outputDir);

        for (let i = 0; i < bugs.length; i++) {
          const bug = bugs[i];
          const xmlData = {
            pma_xml_export: {
              $: {
                version: "1.0",
                "xmlns:pma": "http://www.phpmyadmin.net/some_doc_url/",
              },
              database: {
                table: bug, // Pass the bug directly to table without a 'bug' wrapper
              },
            },
          };

          const builder = new xml2js.Builder();
          const xml = builder.buildObject(xmlData);
          const fileName = `bug_${i + 1}.xml`;

          await new Promise((resolveWrite, rejectWrite) => {
            fs.writeFile(path.join(outputDir, fileName), xml, (writeErr) => {
              if (writeErr) rejectWrite(writeErr);
              else resolveWrite();
            });
          });
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

function createSingleXMLFile(bugs) {
  return new Promise((resolve, reject) => {
    fs.mkdir(outputDir, { recursive: true }, async (mkdirErr) => {
      if (mkdirErr) {
        return reject(mkdirErr);
      }

      try {
        await clearDirectory(outputDir);

        const xmlData = {
          pma_xml_export: {
            $: {
              version: "1.0",
              "xmlns:pma": "http://www.phpmyadmin.net/some_doc_url/",
            },
            database: {
              table: bugs, // Include all bugs as an array under the "table" key
            },
          },
        };

        const builder = new xml2js.Builder();
        const xml = builder.buildObject(xmlData);
        const fileName = `all_bugs.xml`;

        await new Promise((resolveWrite, rejectWrite) => {
          fs.writeFile(path.join(outputDir, fileName), xml, (writeErr) => {
            if (writeErr) rejectWrite(writeErr);
            else resolveWrite();
          });
        });

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}
function createSingleXMLforLocus(bugs) {
  return new Promise((resolve, reject) => {
    fs.mkdir(outputDir, { recursive: true }, async (mkdirErr) => {
      if (mkdirErr) {
        return reject(
          new Error(`Error creating directory: ${mkdirErr.message}`)
        );
      }

      try {
        // Transform bugs into the desired structure
        const transformedBugs = bugs.map((bug) => ({
          $: {
            id:
              bug.column.find((col) => col.$.name === "bug_id")?._ || "unknown",
            opendate:
              bug.column.find((col) => col.$.name === "report_timestamp")?._ ||
              "",
            fixdate:
              bug.column.find((col) => col.$.name === "commit_timestamp")?._ ||
              "",
          },
          buginformation: [
            {
              summary: [
                bug.column.find((col) => col.$.name === "summary")?._ || "",
              ],
              description: [
                bug.column.find((col) => col.$.name === "description")?._ || "",
              ],
            },
          ],
          fixedFiles: [
            {
              file:
                bug.column
                  .find((col) => col.$.name === "files")
                  ?._?.split("\n")
                  .map((file) => file.trim()) || [],
            },
          ],
        }));

        const xmlData = {
          bugrepository: {
            $: { name: "Bug" },
            bug: transformedBugs,
          },
        };

        // Build the transformed XML
        const builder = new xml2js.Builder({
          rootName: "bugrepository",
          xmldec: { version: "1.0", encoding: "UTF-8" },
        });
        const transformedXml = builder.buildObject(xmlData);

        // Write the transformed XML to a file
        const outputFilePath = path.join(outputDir, "locus_all_bugs.xml");
        await new Promise((resolveWrite, rejectWrite) => {
          fs.writeFile(outputFilePath, transformedXml, (writeErr) => {
            if (writeErr) {
              return rejectWrite(
                new Error(`Error writing file: ${writeErr.message}`)
              );
            }
            resolveWrite();
          });
        });

        resolve(outputFilePath);
      } catch (error) {
        reject(new Error(`Error processing XML: ${error.message}`));
      }
    });
  });
}

//Function to append history bugs to bug
const appendBug = function (bugs, historyBugs) {
  if (!Array.isArray(bugs) || !Array.isArray(historyBugs)) {
    throw new Error("Both 'bugs' and 'historyBugs' must be arrays.");
  }

  // Append historyBugs to bugs
  bugs.push(...historyBugs);

  // Return the updated bugs object
  return bugs;
};

async function convertIssueToXML(bugId, issue) {
  const bugData = {
    pma_xml_export: {
      $: {
        version: "1.0",
        "xmlns:pma": "http://www.phpmyadmin.net/some_doc_url/",
      },
      database: {
        table: [
          {
            column: [
              { $: { name: "id" }, _: "1" },
              { $: { name: "bug_id" }, _: bugId.toString() },
              { $: { name: "summary" }, _: issue.issueSummary },
              { $: { name: "description" }, _: issue.issueDescription },
              {
                $: { name: "report_time" },
                _: new Date(issue.reportTimestamp * 1000)
                  .toISOString()
                  .slice(0, 19)
                  .replace("T", " "),
              },
              {
                $: { name: "report_timestamp" },
                _: issue.reportTimestamp.toString(),
              },
              { $: { name: "status" }, _: "open" },
              { $: { name: "commit" }, _: issue.commit },
              {
                $: { name: "commit_timestamp" },
                _: issue.commitTimestamp.toString(),
              },
              { $: { name: "files" }, _: "" },
              { $: { name: "result" }, _: "" },
            ],
          },
        ],
      },
    },
  };
  return bugData;
}
module.exports = {
  parseXML,
  createSeparateXMLFiles,
  createSingleXMLFile,
  createSingleXMLforLocus,
  appendBug,
  convertIssueToXML,
};
