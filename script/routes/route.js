const express = require("express");
const router = express.Router();

const issueHandler = require("../controllers/IssueHandler.js");

router.post("/api/v1/issues", issueHandler.handleIssue);
router.post("/api/config", issueHandler.handleConfig);
router.post("/api/v2/issues", issueHandler.handleIssue2);

module.exports = router;
