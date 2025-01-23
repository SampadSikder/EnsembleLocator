const mongoose = require('mongoose');

const gitSchema = new mongoose.Schema({
    gitRepoURL: {
        type: String,
        required: true,
    },
    alphaValue: {
        type: Number,
        required: true,
    },
    techniqueNum: {
        type: Number,
        required: true,
    },
    bugHistoryFile:{
        type: String,
        required: true
    },
    sourceCodeDir:{
        type: String,
        required: true
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt timestamps
});

const GitConfig = mongoose.model('GitConfig', gitSchema);

module.exports = GitConfig;
