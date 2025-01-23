
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');


const xmlParser = require('./XMLParserAndBuilder.js');



function cloneRepo(repoUrl, targetDirectory) {

  return new Promise((resolve, reject) => {
    const repoName = repoUrl.split('/').pop().replace('.git', '');
    const absoluteTargetDir = path.resolve(targetDirectory);
    const repoPath = path.join(absoluteTargetDir, repoName);
    if (!fs.existsSync(targetDirectory)) {
      fs.mkdirSync(targetDirectory, { recursive: true });
    }
      const cloneCommand = `git clone ${repoUrl} ${repoPath}`;
      console.log(`Cloning repository from ${repoUrl} to ${targetDirectory}`);

      exec(cloneCommand, (cloneErr) => {
          if (cloneErr) {
              reject(`Failed to clone repository: ${cloneErr.message}`);
          } else {
              console.log(`Repository cloned to ${targetDirectory}`);
              resolve(path.resolve(repoPath));
          }
      });
  });
}
function commitCheckout(directory, file) {
    return xmlParser.parseXML(file)
      .then((results) => {
        const commitHash = results.pma_xml_export.database[0].table[0].column.find(col => col.$.name === 'commit')._;
        console.log(`Checking out commit ${commitHash} from ${directory}`);
        return new Promise((resolve, reject) => {
          exec(`cd ${directory} && git checkout ${commitHash} -f`, (checkoutErr) => {
            if (checkoutErr) reject(checkoutErr);
            else resolve();
          });
        });
      })
      .catch((error) => {
        console.error('Error during commit checkout process, using default directory:', error);
      });
  }

  module.exports={
    commitCheckout,
    cloneRepo
  }