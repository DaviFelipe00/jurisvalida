const pdfParse = require('pdf-parse').default || require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;

async function extractText(filePath, mimeType) {
    try {
        const buffer = await fs.readFile(filePath);

        // PDF
        if (mimeType === 'application/pdf') {
            const data = await pdfParse(buffer);
            let text = data.text || "";

            if (text.trim().length < 150) {
                console.log("PDF de imagem detectado, iniciando OCR...");
                const ocr = await Tesseract.recognize(buffer, 'por');
                return ocr.data.text;
            }

            return text;
        }

        // DOCX
        if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer });
            return result.value || "";
        }

        // TXT
        if (mimeType === 'text/plain') {
            return buffer.toString('utf-8');
        }

        return "";
    } catch (error) {
        console.error("Erro na extração:", error);
        throw new Error(`Falha ao ler arquivo: ${error.message}`);
    }
}

module.exports = { extractText };
