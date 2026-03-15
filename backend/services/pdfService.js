const { PDFParse } = require('pdf-parse');

exports.parsePdfBuffer = async (buffer) => {
    try {
        if (!buffer || buffer.length === 0) {
            throw new Error('Empty PDF buffer');
        }
        
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy();
        
        if (!result || typeof result.text !== 'string') {
            throw new Error('No text extracted from PDF');
        }
        
        return result.text;
    } catch (error) {
        console.error('Detailed PDF Parsing Error:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        throw new Error('Could not extract text from PDF: ' + error.message);
    }
};
