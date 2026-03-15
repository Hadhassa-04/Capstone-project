const pdf = require('pdf-parse');
console.log('require("pdf-parse") keys:', Object.keys(pdf));
console.log('require("pdf-parse").PDFParse type:', typeof pdf.PDFParse);

const { PDFParse } = pdf;

async function test() {
    try {
        console.log('Calling PDFParse...');
        // Let's use a very small valid PDF buffer if possible, or just catch the specific error
        const data = await PDFParse(Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF'));
        console.log('Result:', data);
    } catch (err) {
        console.error('Caught Error:', err);
    }
}
test();
