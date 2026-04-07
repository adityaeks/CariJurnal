const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

// Helper: delay/sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Chunking teks agar tidak melebihi batas token AI (~2000 kata per chunk agar lebih aman)
function chunkText(text, wordsPerChunk = 2000) {
    const words = text.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += wordsPerChunk) {
        chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
    }
    return chunks;
}

// Terjemahkan satu chunk dengan retry otomatis saat kena rate limit
async function translateChunkWithGemini(chunk, chunkIndex, totalChunks, modelName = 'gemini-2.0-flash', retryCount = 0) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Anda adalah penerjemah jurnal ilmiah profesional. Terjemahkan teks jurnal ilmiah berikut dari Bahasa Inggris ke Bahasa Indonesia dengan ketentuan:
- Pertahankan istilah teknis/ilmiah dalam bahasa aslinya (dan tulis dalam kurung jika ada padanan Indonesia)
- Pertahankan struktur paragraf dan format aslinya
- Terjemahan harus formal dan ilmiah
- Ini adalah bagian ${chunkIndex + 1} dari ${totalChunks}

Teks yang perlu diterjemahkan:
---
${chunk}
---

Berikan HANYA hasil terjemahan, tanpa komentar tambahan.`;

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
        });
        return response.text;
    } catch (err) {
        const errStr = typeof err === 'string' ? err : JSON.stringify(err);
        const is429 = errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota');

        // Retry hingga 3x dengan delay eksponensial saat kena rate limit
        if (is429 && retryCount < 3) {
            const waitSec = 60 * (retryCount + 1); // 60s, 120s, 180s
            console.warn(`⏳ Rate limit pada bagian ${chunkIndex + 1}, menunggu ${waitSec} detik sebelum retry (${retryCount + 1}/3)...`);
            await sleep(waitSec * 1000);
            return translateChunkWithGemini(chunk, chunkIndex, totalChunks, modelName, retryCount + 1);
        }
        throw err;
    }
}

// Handler utama untuk terjemahan
async function translateJournal(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'File PDF wajib diunggah' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di file .env' });
        }

        console.log(`📄 Memproses PDF: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

        // 1. Ekstrak teks dari PDF
        const pdfData = await pdfParse(req.file.buffer);
        const rawText = pdfData.text.trim();

        if (!rawText || rawText.length < 100) {
            return res.status(400).json({ error: 'PDF tidak mengandung teks yang dapat diekstrak. Pastikan PDF bukan hasil scan.' });
        }

        const wordCount = rawText.split(/\s+/).length;
        console.log(`✅ Teks berhasil diekstrak: ${wordCount} kata`);

        // 2. Bagi teks ke dalam chunks
        const chunks = chunkText(rawText, 3000);
        console.log(`🔀 Teks dibagi menjadi ${chunks.length} bagian untuk diterjemahkan`);

        // 3. Terjemahkan setiap chunk dengan fallback
        const translatedChunks = [];
        let modelUsed = 'gemini-2.0-flash';

        for (let i = 0; i < chunks.length; i++) {
            console.log(`🤖 Menerjemahkan bagian ${i + 1}/${chunks.length}...`);
            try {
                const translated = await translateChunkWithGemini(chunks[i], i, chunks.length, 'gemini-2.0-flash');
                translatedChunks.push(translated);
            } catch (err1) {
                console.warn(`⚠️ gemini-2.0-flash gagal pada bagian ${i+1}, mencoba gemini-2.0-flash-lite...`);
                try {
                    const translated = await translateChunkWithGemini(chunks[i], i, chunks.length, 'gemini-2.0-flash-lite');
                    translatedChunks.push(translated);
                    modelUsed = 'gemini-2.0-flash-lite';
                } catch (err2) {
                    console.error(`❌ Semua model Gemini gagal pada bagian ${i+1}:`, err2.message);
                    throw new Error(`Terjemahan gagal: ${err2.message}`);
                }
            }

            // Delay 10 detik antar chunk untuk menghindari rate limit Gemini free tier
            if (i < chunks.length - 1) {
                console.log(`⏸️  Menunggu 10 detik sebelum chunk berikutnya...`);
                await sleep(10000);
            }
        }

        const translatedText = translatedChunks.join('\n\n');
        console.log(`✅ Terjemahan selesai menggunakan model: ${modelUsed}`);

        // 4. Generate file .docx
        const fileName = req.file.originalname.replace('.pdf', '');
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: `Terjemahan: ${fileName}`,
                        heading: HeadingLevel.HEADING_1,
                        spacing: { after: 300 }
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: `Diterjemahkan oleh AI (${modelUsed}) | JurnalSeng`, italics: true, color: '6B7280', size: 20 })],
                        spacing: { after: 500 }
                    }),
                    ...translatedText.split('\n').filter(p => p.trim()).map(para => new Paragraph({
                        children: [new TextRun({ text: para, size: 24 })],
                        spacing: { after: 200 }
                    }))
                ]
            }]
        });

        const docxBuffer = await Packer.toBuffer(doc);
        const docxBase64 = docxBuffer.toString('base64');

        res.json({
            success: true,
            originalText: rawText,
            translatedText: translatedText,
            wordCount: wordCount,
            chunks: chunks.length,
            modelUsed: modelUsed,
            fileName: fileName,
            docxBase64: docxBase64
        });

    } catch (error) {
        console.error('Error saat terjemahan:', error.message);
        if (error.message.includes('429') || error.message.toLowerCase().includes('quota')) {
            return res.status(429).json({ error: 'Kuota Gemini API telah habis. Silakan coba lagi nanti atau ganti API Key.' });
        }
        res.status(500).json({ error: error.message || 'Terjadi kesalahan saat memproses jurnal' });
    }
}

module.exports = { translateJournal };
