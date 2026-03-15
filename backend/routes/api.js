const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parsePdfBuffer } = require('../services/pdfService');
const aiService = require('../services/aiService');
const ObjectId = require('mongoose').Types.ObjectId;
const Document = require('../models/Document');
const auth = require('../middleware/auth');

// Multer setup for in-memory file processing
const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET /api/documents - Get all documents for the logged in user
router.get('/documents', auth, async (req, res) => {
    try {
        const docs = await Document.find({ userId: req.user.id })
            .select('-text -summary -keyTopics -quiz') // Exclude heavy fields for the list
            .sort({ createdAt: -1 });
        res.json(docs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/upload - Upload a PDF, extract text, and save to DB
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        if (req.file.mimetype !== 'application/pdf') {
            return res.status(400).json({ error: 'Only PDF files are supported' });
        }

        // Extract text from PDF buffer
        const text = await parsePdfBuffer(req.file.buffer);

        // Save to database
        const newDoc = new Document({
            userId: req.user.id,
            originalName: req.file.originalname,
            text: text,
        });

        await newDoc.save();

        res.json({ message: 'File uploaded and parsed successfully', documentId: newDoc._id });
    } catch (error) {
        console.error('Detailed Upload Error:', {
            message: error.message,
            stack: error.stack,
            file: req.file ? req.file.originalname : 'no file'
        });
        res.status(500).json({ error: 'Failed to process file' });
    }
});

// GET /api/summary/:id - Generate or return summary and key topics
router.get('/summary/:id', auth, async (req, res) => {
    try {
        const doc = await Document.findOne({ _id: req.params.id, userId: req.user.id });
        if (!doc) return res.status(404).json({ error: 'Document not found or unauthorized' });

        // Check if summary already exists to save quota
        if (doc.summary && doc.keyTopics && doc.keyTopics.length > 0) {
            return res.json({ summary: doc.summary, keyTopics: doc.keyTopics });
        }

        const { summary, keyTopics } = await aiService.generateSummaryAndTopics(doc.text);

        doc.summary = summary;
        doc.keyTopics = keyTopics;
        await doc.save();

        res.json({ summary, keyTopics });
    } catch (error) {
        console.error('Summary Error:', error);
        if (error.status === 429 || (error.message && (error.message.includes('quota') || error.message.includes('429')))) {
            return res.status(429).json({ error: 'AI Quota Limit Exceeded. Please try again later or check your API key.' });
        }
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

// POST /api/chat/:id - Ask a question about the document
router.post('/chat/:id', auth, async (req, res) => {
    try {
        const doc = await Document.findOne({ _id: req.params.id, userId: req.user.id });
        if (!doc) return res.status(404).json({ error: 'Document not found or unauthorized' });

        const { question } = req.body;
        if (!question) return res.status(400).json({ error: 'Question is required' });

        const answer = await aiService.answerQuestion(doc.text, question);

        res.json({ answer });
    } catch (error) {
        console.error('Chat Error:', error);
        if (error.message.includes('quota') || error.message.includes('429')) {
            return res.status(429).json({ error: 'AI Quota Limit Exceeded. Please try again later.' });
        }
        res.status(500).json({ error: 'Failed to answer question' });
    }
});

// GET /api/quiz/:id - Generate or return quiz
router.get('/quiz/:id', auth, async (req, res) => {
    try {
        const doc = await Document.findOne({ _id: req.params.id, userId: req.user.id });
        if (!doc) return res.status(404).json({ error: 'Document not found or unauthorized' });

        if (doc.quiz && doc.quiz.length > 0) {
            return res.json({ quiz: doc.quiz });
        }

        const quizData = await aiService.generateQuiz(doc.text);

        doc.quiz = quizData;
        await doc.save();

        res.json({ quiz: quizData });
    } catch (error) {
        console.error('Quiz Error:', error);
        if (error.message.includes('quota') || error.message.includes('429')) {
            return res.status(429).json({ error: 'AI Quota Limit Exceeded. Please try again later.' });
        }
        res.status(500).json({ error: 'Failed to generate quiz' });
    }
});

module.exports = router;
