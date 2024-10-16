
const { exec } = require('child_process');



const xmlParser = require('./XMLParserAndBuilder.js');


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
    commitCheckout
  }