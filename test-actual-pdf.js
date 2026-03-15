const { PDFParse } = require('./backend/services/pdfService' === '' ? {} : require('pdf-parse'));
const fs = require('fs');

async function test() {
    try {
        const buffer = fs.readFileSync('backend/sample.pdf');
        console.log('Buffer length:', buffer.length);
        
        const { PDFParse } = require('pdf-parse');
        console.log('PDFParse type:', typeof PDFParse);
        
        const parser = new PDFParse({ data: buffer });
        console.log('Parser created');
        
        const result = await parser.getText();
        console.log('Text extracted, length:', result.text.length);
        console.log('First 100 chars:', result.text.substring(0, 100));
        
        await parser.destroy();
        console.log('Parser destroyed');
    } catch (err) {
        console.error('Test Failed:', err);
    }
}

test();
