document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const clearFileBtn = document.getElementById('clearFileBtn');
    const translateBtn = document.getElementById('translateBtn');

    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar');
    const progressStatus = document.getElementById('progressStatus');
    const uploadSection = document.getElementById('uploadSection');

    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');

    const resultSection = document.getElementById('resultSection');
    const resultMeta = document.getElementById('resultMeta');
    const originalText = document.getElementById('originalText');
    const translatedText = document.getElementById('translatedText');
    const downloadTxtBtn = document.getElementById('downloadTxtBtn');
    const downloadDocxBtn = document.getElementById('downloadDocxBtn');
    const translateNewBtn = document.getElementById('translateNewBtn');

    let selectedFile = null;
    let resultData = null;

    // ---- File Selection ----
    browseBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) setFile(fileInput.files[0]);
    });

    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
    });
    dropZone.addEventListener('click', (e) => {
        if (e.target !== browseBtn) fileInput.click();
    });

    clearFileBtn.addEventListener('click', clearFile);

    function setFile(file) {
        if (file.type !== 'application/pdf') {
            showError('Hanya file PDF yang dapat diterima.');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            showError('Ukuran file melebihi batas 20MB.');
            return;
        }
        selectedFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = `(${(file.size / 1024).toFixed(1)} KB)`;
        fileInfo.classList.remove('hidden');
        translateBtn.disabled = false;
        errorSection.classList.add('hidden');
    }

    function clearFile() {
        selectedFile = null;
        fileInput.value = '';
        fileInfo.classList.add('hidden');
        translateBtn.disabled = true;
    }

    // ---- Translation ----
    translateBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        // Reset states
        errorSection.classList.add('hidden');
        resultSection.classList.add('hidden');
        uploadSection.classList.add('hidden');
        progressSection.classList.remove('hidden');

        // Simulate progress animation saat menunggu API
        let fakeProgress = 0;
        const progressMessages = [
            'Mengekstrak teks dari PDF...',
            'Mempersiapkan terjemahan...',
            'Mengirim ke Google Gemini AI...',
            'AI sedang menerjemahkan...',
            'Hampir selesai, menyusun hasil...'
        ];
        let msgIdx = 0;
        const progressInterval = setInterval(() => {
            // Fake progress berjalan sampai 85%, sisanya menunggu response asli
            if (fakeProgress < 85) {
                fakeProgress += Math.random() * 8;
                if (fakeProgress > 85) fakeProgress = 85;
                progressBar.style.width = `${fakeProgress}%`;
            }
            if (msgIdx < progressMessages.length - 1 && fakeProgress > (msgIdx + 1) * 17) {
                msgIdx++;
            }
            progressStatus.textContent = progressMessages[Math.min(msgIdx, progressMessages.length - 1)];
        }, 800);

        try {
            const formData = new FormData();
            formData.append('pdf', selectedFile);

            const response = await fetch('/api/translate', {
                method: 'POST',
                body: formData
            });

            clearInterval(progressInterval);
            progressBar.style.width = '100%';
            progressStatus.textContent = 'Terjemahan berhasil!';

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Terjadi kesalahan pada server');

            resultData = data;
            await new Promise(r => setTimeout(r, 600)); // brief pause sebelum tampilkan hasil

            // Show result
            progressSection.classList.add('hidden');
            resultSection.classList.remove('hidden');

            resultMeta.textContent = `${new Intl.NumberFormat('id-ID').format(data.wordCount)} kata · ${data.chunks} bagian · Model: ${data.modelUsed}`;
            originalText.textContent = data.originalText;
            translatedText.textContent = data.translatedText;

        } catch (err) {
            clearInterval(progressInterval);
            progressSection.classList.add('hidden');
            uploadSection.classList.remove('hidden');
            showError(err.message);
        }
    });

    // ---- Download Functions ----
    downloadTxtBtn.addEventListener('click', () => {
        if (!resultData) return;
        const blob = new Blob([resultData.translatedText], { type: 'text/plain;charset=utf-8' });
        triggerDownload(blob, `${resultData.fileName}_terjemahan.txt`);
    });

    downloadDocxBtn.addEventListener('click', () => {
        if (!resultData || !resultData.docxBase64) return;
        const byteChars = atob(resultData.docxBase64);
        const byteNumbers = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        triggerDownload(blob, `${resultData.fileName}_terjemahan.docx`);
    });

    function triggerDownload(blob, name) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ---- Reset ----
    translateNewBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        clearFile();
        resultData = null;
    });

    // ---- Helpers ----
    function showError(msg) {
        errorSection.classList.remove('hidden');
        errorMessage.textContent = msg;
    }
});
