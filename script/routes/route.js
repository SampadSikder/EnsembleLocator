const express = require("express");
const multer = require("multer");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const uploadDir = path.join(__dirname, "../uploads");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log("Uploads directory created successfully.");
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

const issueHandler = require("../controllers/IssueHandler.js");

router.post("/api/v1/issues", issueHandler.handleIssue);
router.post(
  "/api/config",
  upload.single("bugHistoryFile"),
  issueHandler.handleConfig
);
router.post("/api/v2/issues", issueHandler.handleIssue2);

module.exports = router;
