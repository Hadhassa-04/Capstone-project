const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        // Unfortunately the SDK doesn't have a direct listModels, we have to use the API or guess.
        // But we can try to generate content with a common one.
        const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro'];
        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                await model.generateContent('test');
                console.log(`Model ${m} is working!`);
            } catch (e) {
                console.log(`Model ${m} failed: ${e.message}`);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
