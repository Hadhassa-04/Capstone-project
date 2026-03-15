const { GoogleGenerativeAI } = require('@google/generative-ai');

const placeholderKeys = ['YOUR_GEMINI_API_KEY', 'YOUR_API_KEY_HERE', 'YOUR_API_KEY'];
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = GEMINI_API_KEY && !placeholderKeys.includes(GEMINI_API_KEY)
    ? new GoogleGenerativeAI(GEMINI_API_KEY) 
    : null;

const MODEL_NAME = 'gemini-1.5-flash';

/**
 * Clean AI response by removing markdown code blocks if present
 */
const cleanAIResponse = (text) => {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

/**
 * Local text processing for Mock Mode
 */
const mockGenerateSummary = (text) => {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
    const summarySentences = sentences.slice(0, 5);
    return summarySentences.join('. ') + '.\n\nKey takeaways from this document include the core concepts discussed above, emphasizing the specific details and data points mentioned in the text.';
};

const mockExtractTopics = (text) => {
    const words = text.match(/\b[A-Z][a-z]{3,}\b/g) || [];
    const counts = {};
    words.forEach(w => counts[w] = (counts[w] || 0) + 1);
    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return sorted.slice(0, 6).map(topic => ({
        key: topic,
        summary: `This topic covers various aspects of ${topic} as discussed in the document, providing context and detailed information.`
    }));
};

const mockGenerateQuiz = (text) => {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 30);
    const quiz = [];
    for (let i = 0; i < Math.min(5, sentences.length); i++) {
        const sentence = sentences[i];
        const words = sentence.split(' ');
        if (words.length < 10) continue;
        
        const targetWordIndex = Math.floor(words.length / 2);
        const targetWord = words[targetWordIndex].replace(/[^a-zA-Z]/g, '');
        words[targetWordIndex] = '__________';
        
        quiz.push({
            question: `In the context of the document, complete this statement: "${words.join(' ')}"`,
            options: [targetWord, 'Information', 'Context', 'Process'],
            answer: targetWord
        });
    }
    return JSON.stringify(quiz);
};

const mockAnswerQuestion = (text, question) => {
    return `Based on the document provided, the answer to "${question}" involves the key themes discussed in the text, specifically regarding the primary subjects and data points mentioned in the earlier sections.`;
};

/**
 * Generic helper to run an AI task with model fallbacks OR Mock Mode
 */
const callAIWithFallback = async (promptTask, text, additionalData = '', mockFunc = null) => {
    if (!genAI) {
        console.log('No API Key found. Running in Mock AI Mode.');
        if (mockFunc) return mockFunc(text, additionalData);
        return "Mock output for the requested task.";
    }

    const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.0-flash'];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`Attempting AI task with model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const prompt = promptTask(text, additionalData);

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error(`Error with model ${modelName}:`, {
                message: error.message,
                status: error.status
            });
            lastError = error;
            if (error.status === 429) throw error; // Quota hit, don't fallback to invalid models
            if (error.status === 404 || error.message.includes('not found')) {
                continue;
            }
            throw error; 
        }
    }
    throw lastError;
};

exports.generateSummaryAndTopics = async (text) => {
    if (!genAI) {
        return {
            summary: mockGenerateSummary(text),
            keyTopics: mockExtractTopics(text)
        };
    }

    const promptTask = (t) => `Perform the following tasks on the provided text:
    1. Summarize the text comprehensively but concisely. Break it down into key bullet points and a short concluding paragraph.
    2. Extract 5 to 8 key concepts or topics from the text. 

    Return the output STRICTLY as a JSON object with the following keys:
    - "summary": The summary string.
    - "keyTopics": An array of objects, each with "key" (1-3 words) and "summary" (1-2 sentences).

    Do not include markdown codeblocks in your response.

    TEXT:
    ${t}`;

    const resultText = await callAIWithFallback(promptTask, text);
    return JSON.parse(cleanAIResponse(resultText.toString()));
};

exports.generateSummary = async (text) => {
    const promptTask = (t) => `Summarize the following text comprehensively but concisely. Break it down into key bullet points and a short concluding paragraph. \n\nTEXT:\n${t}`;
    const result = await callAIWithFallback(promptTask, text, '', mockGenerateSummary);
    return result.toString();
};

exports.extractKeyTopics = async (text) => {
    if (!genAI) return mockExtractTopics(text);
    
    const promptTask = (t) => `Extract 5 to 8 key concepts or topics from the following text. 
    Return the output STRICTLY as a JSON array of objects. Do not include markdown codeblocks. 
    Each object must have the following keys:
    - "key": A short 1-3 word title for the topic
    - "summary": A 1-2 sentence explanation of the topic based on the text.
    
    TEXT:\n${t}`;

    const resultText = await callAIWithFallback(promptTask, text);
    return JSON.parse(cleanAIResponse(resultText.toString()));
};

exports.answerQuestion = async (text, question) => {
    const promptTask = (t, q) => `Based ONLY on the following text, answer the user's question accurately. If the answer is not contained in the text, say "I cannot find the answer to this question in the provided document."\n\nTEXT:\n${t}\n\nQUESTION: ${q}`;
    const result = await callAIWithFallback(promptTask, text, question, mockAnswerQuestion);
    return result.toString();
};

exports.generateQuiz = async (text) => {
    if (!genAI) return JSON.parse(mockGenerateQuiz(text));

    const promptTask = (t) => `Generate a 5-question multiple choice quiz based on the following text. 
    Return the output STRICTLY as a JSON array of objects. Do not include markdown codeblocks. 
    Each object must have the following keys:
    - "question": The question text
    - "options": An array of 4 string options
    - "answer": The exact string of the correct option from the "options" array.
    
    TEXT:\n${t}`;

    const resultText = await callAIWithFallback(promptTask, text, '', mockGenerateQuiz);
    return JSON.parse(cleanAIResponse(resultText.toString()));
};
