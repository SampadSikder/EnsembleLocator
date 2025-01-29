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

const appendBug = function (bugs, historyBugs) {
  if (!Array.isArray(bugs) || !Array.isArray(historyBugs)) {
    throw new Error("Both 'bugs' and 'historyBugs' must be arrays.");
  }

  bugs.push(...historyBugs);

  return bugs;
};

function escapeXml(str) {
  if (!str) return "";
  return str
    .replace(/^"|"$/g, "") // Remove surrounding quotes added by JSON.stringify
    .replace(/&/g, "&amp;") // Escape ampersand
    .replace(/</g, "&lt;") // Escape less than
    .replace(/>/g, "&gt;") // Escape greater than
    .replace(/"/g, "&quot;") // Escape double quotes
    .replace(/'/g, "&apos;") // Escape single quotes
    .replace(/\r?\n/g, "&#xD;"); // Convert newlines to XML format (Carriage Return)
}

async function convertIssueToXML(bugId, issue, latestCommitId) {
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
              { $: { name: "summary" }, _: escapeXml(issue.title) },
              {
                $: { name: "description" },
                _: escapeXml(issue.body),
              },
              {
                $: { name: "report_time" },
                _: new Date(issue.created_at).getTime() / 1000,
              },
              {
                $: { name: "report_timestamp" },
                _: new Date(issue.created_at).getTime() / 1000,
              },
              { $: { name: "status" }, _: "open" },
              { $: { name: "commit" }, _: latestCommitId.slice(0, 5) },
              {
                $: { name: "commit_timestamp" },
                _: new Date(issue.updated_at).getTime() / 1000,
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
