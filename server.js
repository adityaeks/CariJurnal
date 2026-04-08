const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const { searchScopus, getScopusInsight } = require('./backend/scopus');
const { translateJournal } = require('./backend/translate');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer: simpan file di memory (tidak perlu disimpan ke disk)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // maks 20MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Hanya file PDF yang diizinkan'), false);
        }
        cb(null, true);
    }
});

app.use(cors());
app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// ---- API Routes ----
// Scopus Search API
app.get('/api/search', searchScopus);
app.get('/api/insight', getScopusInsight);

// PDF Translation API
app.post('/api/translate', upload.single('pdf'), translateJournal);

// ---- Frontend Routes ----
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'landing.html'));
});

app.get('/search', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'search.html'));
});

app.get('/translate', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'translate.html'));
});

// Error handler for multer
app.use((err, req, res, next) => {
    if (err.message) {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
