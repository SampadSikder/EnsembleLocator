const express = require('express');
const router = express.Router();

const issueHandler = require('../controllers/IssueHandler.js');;


router.post('/api/issue', issueHandler.handleIssue);


module.exports = router;
