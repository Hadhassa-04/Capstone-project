require('dotenv').config({ path: './.env' });
const { PDFParse } = require('pdf-parse');
const fs = require('fs');

async function test() {
    try {
        console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY);
        const buffer = fs.readFileSync('sample.pdf');
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        console.log('Text extracted:', result.text.substring(0, 50));
        await parser.destroy();
    } catch (err) {
        console.error('Test Failed:', err);
    }
}
test();
