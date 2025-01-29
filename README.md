# Introduction

Maintaining large-scale software projects requires developers to regularly review bug and error reports submitted by users.With software often comprising thousands of lines of code and hundreds of files, pinpointing the root cause of a bug can be a daunting task. Bug localization techniques can assist developers by identifying areas to investigate. These techniques analyze the source code repository and generate a ranked list of potential files where bugs may reside, significantly easing software maintenance and saving developers valuable time.This greatly eases software maintenance, and saves developers a lot of time. 

In broad terms, fault localization can be of two types: Static bug localization and dynamic bug localization. Static bug localization doesn't need the program to be run and relies on information retrieval techniques to generate the ranked list. Dynamic approaches require the program trace and hence require multiple runtime traces of the program. 

Several static techniques exist to localize bugs, for example:

- BugLocator
- AmaLgam
- BLIA
- BLUiR
- BRTracer
- Locus

Each of these techniques has varying degrees of accuracy, along with distinct advantages and disadvantages in localizing bugs. An ensemble approach that combines these techniques can greatly enhance fault localization. The objective of this project is to develop a GitHub plugin/extension that utilizes this ensemble approach to generate a ranked list of buggy files based on GitHub issues.

# How to run
## Prerequisites

Node.js: Ensure you have Node.js installed. Download it from Node.js official website.
Ngrok: Install Ngrok from Ngrok official website.
Git: Ensure Git is installed. Download it from Git official website.

## Setting up the repository
```
git clone https://github.com/SampadSikder/EnsembleLocator 
cd EnsembleLocator
cd script
npm install
cd ../frontend/findyourbug
npm install
```

## Connecting with Github

- Install and start ngrok:
```
ngrok http 8080
```
- Copy the provided URL (example: https://<random_string>.ngrok.io)
- Update the backend script's .env file with the following:
```
WEBHOOK_URL=<Your Ngrok URL>
```

## Configure Github API
- Create a Personal Access Token
- Add the following in the env file:
```
CLIENT_ID=<Your GitHub Client ID>
CLIENT_SECRET=<Your GitHub Client Secret>
GITHUB_TOKEN=<Your GitHub Personal Access Token>
```


## Setting up LLM-Based Fusion (Optional)

- Obtain LLM Key from Gemini API Documentation
- Add to env:
  ```
  GEMINI_API_KEY=<Your Gemini API Key>
  ```
- Obtain Langchain key from LangSmith API Documentation
- Add to env:
  ```
  LANGSMITH_API_KEY=<Your LangSmith API Key>
  ```

## Project Workflow
- Start the backend:
  ```npm start```
- Start the frontend:
  ```npm run dev```

This starts the project on http://localhost:5137. Backend runs on http://localhost:8080.
