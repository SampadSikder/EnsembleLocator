const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const xmlParser = require("./XMLParserAndBuilder.js");

async function githubAuthentication(req, res) {
  const { code } = req.query;
  try {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken = response.data.access_token;
    res.redirect(`http://localhost:5173/?token=${accessToken}`);
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).send("Authentication failed");
  }
}

async function getLatestCommitId(owner, repo, branch = "main") {
  try {
    const repoResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`
    );

    const defaultBranch = repoResponse.data.default_branch || branch;

    const commitResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits/${defaultBranch}`
    );

    return commitResponse.data.sha;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 404) {
        console.error(
          "Repository or branch not found. Check if the repository exists and has commits."
        );
      } else if (error.response.status === 422) {
        console.error("No commit found. The repository might be empty.");
      } else {
        console.error(
          `Error fetching commit: ${error.response.status} - ${error.response.data.message}`
        );
      }
    } else {
      console.error("Error connecting to GitHub API:", error.message);
    }
    return null; // Return null if fetching fails
  }
}
async function githubWorkflowSetup(req, res) {
  const { repoUrl, token } = req.body;
  const [owner, repo] = repoUrl
    .replace("https://github.com/", "")
    .replace(".git", "")
    .split("/");
  const webhookURL = process.env.WEBHOOK_URL;

  try {
    await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/hooks`,
      {
        config: {
          url: `${webhookURL}/api/v2/issues`,
          content_type: "json",
        },
        events: ["issues"],
      },
      { headers: { Authorization: `token ${token}` } }
    );

    const repoDetails = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers: { Authorization: `token ${token}` } }
    );

    const defaultBranch = repoDetails.data.default_branch || "main";
    let latestCommitId = "unknown";
    try {
      const commitResponse = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/commits/${defaultBranch}`,
        { headers: { Authorization: `token ${token}` } }
      );
      latestCommitId = commitResponse.data.sha;
    } catch (error) {
      if (error.response && error.response.status === 422) {
        console.error("Repository might be empty or branch not found.");
      } else {
        console.error("Error fetching commit:", error.message);
      }
    }

    const workflowContent = `
      name: Issue Listener

      on:
        issues:
          types: [opened]

      jobs:
        post_issue_to_backend:
          runs-on: ubuntu-latest
          steps:
            - name: Checkout repository
              uses: actions/checkout@v4

            - name: Post issue to backend
              env:
                ISSUE_URL: \${{ github.event.issue.html_url }}
                ISSUE_SUMMARY: \${{ github.event.issue.title }}
                ISSUE_DESCRIPTION: \${{ github.event.issue.body }}
                COMMIT_ID: "${latestCommitId}"
              run: |
                COMMIT=\$(git rev-parse HEAD)
                COMMIT_TIMESTAMP_RAW=\$(git show -s --format=%ct ${latestCommitId})
                REPORT_TIMESTAMP_RAW=\$(date +%s)

                COMMIT_TIMESTAMP=\$(date -d @\${COMMIT_TIMESTAMP_RAW} +"%Y-%m-%d %H:%M:%S")
                REPORT_TIMESTAMP=\$(date -d @\${REPORT_TIMESTAMP_RAW} +"%Y-%m-%d %H:%M:%S")

                RESPONSE=\$(curl -X POST https://ffa3-103-198-136-205.ngrok-free.app/api/v2/issues \\
                -H "Content-Type: application/json" \\
                -d '{
                  "issueURL": "'"$ISSUE_URL"'",
                  "issueSummary": "'"$ISSUE_SUMMARY"'",
                  "issueDescription": "'"$ISSUE_DESCRIPTION"'",
                  "commit": "'"$COMMIT"'",
                  "commitTimestamp": "'"$COMMIT_TIMESTAMP"'",
                  "reportTimestamp": "'"$REPORT_TIMESTAMP"'"
                }')

                echo "Backend response: $RESPONSE"

                curl -X POST https://api.github.com/repos/${owner}/${repo}/issues/\${{ github.event.issue.number }}/comments \\
                -H "Authorization: token \${{ secrets.GITHUB_TOKEN }}" \\
                -H "Content-Type: application/json" \\
                -d '{
                  "body": "Issue processed successfully. Backend response: '$RESPONSE'"
                }'
    `;

    await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/.github/workflows/issue_listener.yml`,
      {
        message: "Adding issue listener workflow",
        content: Buffer.from(workflowContent.trim()).toString("base64"),
      },
      { headers: { Authorization: `token ${token}` } }
    );

    res.json({
      message: "Workflow configured successfully, now saving configuration...",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Setup failed" });
  }
}

function cloneRepo(repoUrl, targetDirectory) {
  return new Promise((resolve, reject) => {
    const repoName = repoUrl.split("/").pop().replace(".git", "");
    const absoluteTargetDir = path.resolve(targetDirectory);
    const repoPath = path.join(absoluteTargetDir, repoName);
    if (!fs.existsSync(targetDirectory)) {
      fs.mkdirSync(targetDirectory, { recursive: true });
    }

    // Check if repository already exists
    if (fs.existsSync(path.join(repoPath, ".git"))) {
      console.log(`Repository already exists at ${repoPath}`);
      resolve(repoPath);
      return;
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
  return xmlParser
    .parseXML(file)
    .then((results) => {
      const commitHash =
        results.pma_xml_export.database[0].table[0].column.find(
          (col) => col.$.name === "commit"
        )._;
      console.log(`Checking out commit ${commitHash} from ${directory}`);
      return new Promise((resolve, reject) => {
        exec(
          `cd ${directory} && git checkout ${commitHash} -f`,
          (checkoutErr) => {
            if (checkoutErr) reject(checkoutErr);
            else resolve();
          }
        );
      });
    })
    .catch((error) => {
      console.error(
        "Error during commit checkout process, using default directory:",
        error
      );
    });
}

module.exports = {
  commitCheckout,
  cloneRepo,
  githubAuthentication,
  githubWorkflowSetup,
  getLatestCommitId,
};
