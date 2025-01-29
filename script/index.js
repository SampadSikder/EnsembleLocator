const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const readline = require("readline");
const connectDB = require("./database/db.js");
const dotenv = require("dotenv");

dotenv.config();

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const routes = require("./routes/route.js");
app.use("/", routes);

const port = 8080;
const main = async () => {
  try {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("An error occurred:", error);
  }
};

main();
