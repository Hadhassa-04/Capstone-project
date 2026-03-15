const https = require('https');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

function checkModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            const parsed = JSON.parse(data);
            if (parsed.models) {
                console.log('Available Models:');
                parsed.models.forEach(m => console.log(`- ${m.name} (${m.displayName})`));
            } else {
                console.log('No models found or error:', JSON.stringify(parsed, null, 2));
            }
        });
    }).on('error', (err) => {
        console.error('Error:', err.message);
    });
}

checkModels();
