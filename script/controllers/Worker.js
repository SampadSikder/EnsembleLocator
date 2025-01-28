const { parentPort, workerData } = require("worker_threads");
const { runCommandForEachFile } = require("./IssueHandler.js");

(async () => {
  try {
    await runCommandForEachFile(
      workerData.sourceCodeDir,
      workerData.alphaValue,
      workerData.techniqueNum
    );
    parentPort.postMessage({ success: true });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
})();
