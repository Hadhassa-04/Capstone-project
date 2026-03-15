const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalName: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
  },
  keyTopics: {
    type: Array, // Array of { summary: String, key: String }
  },
  quiz: {
    type: Array, // Array of question objects
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Document', DocumentSchema);
