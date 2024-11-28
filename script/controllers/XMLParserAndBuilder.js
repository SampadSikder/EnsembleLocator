const path = require('path');
const fs = require('fs');
const xml2js = require('xml2js');


const outputDir = path.join(__dirname, '../BugReports');

function parseXML(filePath) {
    return new Promise((resolve, reject) => {
      console.log(`Attempting to read file: ${filePath}`);
      fs.readFile(filePath, 'utf8', (err, data) => {
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
          if (err.code === 'ENOENT') {
            console.log(`Directory does not exist: ${directory}`);
            return resolve();
          }
          return reject(err);
        }
        Promise.all(files.map(file => 
          new Promise((resolveUnlink, rejectUnlink) => {
            fs.unlink(path.join(directory, file), (unlinkErr) => {
              if (unlinkErr) rejectUnlink(unlinkErr);
              else resolveUnlink();
            });
          })
        )).then(() => {
          console.log(`Cleared directory: ${directory}`);
          resolve();
        }).catch(reject);
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
              "pma_xml_export": {
                "$": {
                  "version": "1.0",
                  "xmlns:pma": "http://www.phpmyadmin.net/some_doc_url/"
                },
                "database": {
                  "table": bug // Pass the bug directly to table without a 'bug' wrapper
                }
              }
            };
  
            const builder = new xml2js.Builder();
            const xml = builder.buildObject(xmlData);
            const fileName = `bug_${i+1}.xml`;
  
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
            "pma_xml_export": {
              "$": {
                "version": "1.0",
                "xmlns:pma": "http://www.phpmyadmin.net/some_doc_url/"
              },
              "database": {
                "table": bugs // Include all bugs as an array under the "table" key
              }
            }
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
  //TBD a function to append the new issue as a bug to the bug repository 
  const appendBug = function(bug){
    // Implement your bug appending logic here.
    // For example, you could use a database or a file system to save the bug information.
    console.log(`Appending bug:`, bug);
  }
module.exports = {
    parseXML,
    createSeparateXMLFiles,
    createSingleXMLFile
}