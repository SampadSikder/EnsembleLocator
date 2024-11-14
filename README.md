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

- Navigate to script folder
- Run 
  ```npm install```
- Run
  ```node index.js```
- Specify bug report, source code directory and alpha value