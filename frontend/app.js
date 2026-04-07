document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm');
    const sortInput = document.getElementById('sortInput');
    
    // UI Elements
    const emptyState = document.getElementById('emptyState');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const loadingState = document.getElementById('loadingState');
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsList = document.getElementById('resultsList');
    const totalResults = document.getElementById('totalResults');
    
    // Pagination Elements
    const paginationContainer = document.getElementById('paginationContainer');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const loadMoreText = document.getElementById('loadMoreText');
    const loadMoreSpinner = document.getElementById('loadMoreSpinner');
    const paginationInfo = document.getElementById('paginationInfo');

    let currentStart = 0;
    let currentQs = null;

    // Advanced Search Accordion Logic
    const toggleAdvancedBtn = document.getElementById('toggleAdvancedBtn');
    const advancedSearchArea = document.getElementById('advancedSearchArea');
    const toggleAdvancedIcon = document.getElementById('toggleAdvancedIcon');

    toggleAdvancedBtn.addEventListener('click', () => {
        advancedSearchArea.classList.toggle('hidden');
        if (advancedSearchArea.classList.contains('hidden')) {
            toggleAdvancedIcon.classList.remove('-rotate-180');
        } else {
            toggleAdvancedIcon.classList.add('-rotate-180');
        }
    });

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Build query string
        const qs = new URLSearchParams();
        
        const fields = ['authors', 'yearStart', 'yearEnd', 'affiliations', 'pubName', 'issn', 'titleWords', 'keywords', 'generalSearch'];
        fields.forEach(field => {
            const val = document.getElementById(field).value.trim();
            if (val) {
                // If it's generalSearch, append it as 'q'
                if (field === 'generalSearch') {
                    qs.append('q', val);
                } else {
                    qs.append(field, val);
                }
            }
        });
        
        const openAccessChecked = document.getElementById('openAccess').checked;
        if (openAccessChecked) qs.append('oa', 'true');

        qs.append('sort', sortInput.value);

        // Validasi
        if (qs.toString().indexOf('=') === qs.toString().lastIndexOf('=') && !qs.has('q')) {
            let hasSearchFields = false;
            qs.forEach((v, k) => {
                if (k !== 'sort') hasSearchFields = true;
            });

            if (!hasSearchFields) {
                alert('Peringatan: Harap isi setidaknya satu kolom pencarian sebelum mencari (misal: Title words, atau Authors).');
                return;
            }
        }

        currentStart = 0;
        currentQs = qs;
        await performSearch(false);
    });

    loadMoreBtn.addEventListener('click', async () => {
        if (!currentQs) return;
        currentStart += 25; // API Default Scopus membatasi fetch 25 items (max 200 via view=STANDARD)
        await performSearch(true);
    });

    async function performSearch(isLoadMore) {
        if (!isLoadMore) {
            emptyState.classList.add('hidden');
            errorState.classList.add('hidden');
            resultsContainer.classList.add('hidden');
            loadingState.classList.remove('hidden');
            paginationContainer.classList.add('hidden');
            resultsList.innerHTML = '';
        } else {
            loadMoreText.textContent = 'Memuat Data...';
            loadMoreSpinner.classList.remove('hidden');
            loadMoreBtn.disabled = true;
        }

        try {
            const url = `/api/search?${currentQs.toString()}&start=${currentStart}`;
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Terjadi kesalahan pada server');
            }

            if (!isLoadMore) loadingState.classList.add('hidden');
            else {
                loadMoreText.textContent = 'Tampilkan Selanjutnya (Next Page)';
                loadMoreSpinner.classList.add('hidden');
                loadMoreBtn.disabled = false;
            }
            
            if (data.results.length === 0 && !isLoadMore) {
                emptyState.classList.remove('hidden');
                emptyState.querySelector('p').textContent = `Tidak ditemukan referensi jurnal yang cocok dengan kriteria pencarian tersebut.`;
                return;
            }

            // Populate data
            resultsContainer.classList.remove('hidden');
            totalResults.textContent = new Intl.NumberFormat('id-ID').format(data.total);

            data.results.forEach(item => {
                const card = document.createElement('div');
                card.className = 'bg-white rounded-lg shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 transition-all group flex flex-col sm:flex-row justify-between sm:items-start gap-4';
                
                const safeTitle = escapeHTML(item.title) || 'Tanpa Judul';
                const safeAuthor = escapeHTML(item.author) || 'Author tidak diketahui';
                const safeSource = escapeHTML(item.sourceTitle) || 'Sumber tidak diketahui';
                const year = escapeHTML(item.year);
                const cited = item.citedBy;
                const safeDoi = escapeHTML(item.doi);

                const doiHtml = safeDoi 
                    ? `<p class="text-slate-600 text-sm mb-3">
                           <span class="font-medium">🔗 DOI:</span> <a href="https://doi.org/${safeDoi}" target="_blank" class="text-blue-600 hover:text-blue-700 hover:underline transition-colors">${safeDoi}</a>
                       </p>`
                    : '';

                card.innerHTML = `
                    <div class="flex-grow">
                        <h3 class="text-lg font-semibold text-slate-800 leading-snug mb-2 group-hover:text-blue-600 transition-colors">${safeTitle}</h3>
                        <p class="text-slate-600 text-sm mb-1">
                            <span class="font-medium">👨‍🔬 Author:</span> ${safeAuthor}
                        </p>
                        <p class="text-slate-600 text-sm mb-2">
                            <span class="font-medium">📝 Publikasi:</span> <span class="italic font-medium">${safeSource}</span> (${year})
                        </p>
                        ${doiHtml}
                        <div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 mt-1">
                            ⭐ Sitasi: ${cited}
                        </div>
                    </div>
                    <div class="flex-shrink-0 pt-1">
                        <a href="${item.scopusLink}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors group-hover:border-blue-300">
                            <svg class="mr-2 h-4 w-4 text-slate-500 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Buka di Scopus
                        </a>
                    </div>
                `;
                resultsList.appendChild(card);
            });

            // Calculate pagination logic to decide if we show NEXT PAGE btn
            const loadedItemsTotal = currentStart + data.results.length;
            if (loadedItemsTotal < data.total) {
                paginationContainer.classList.remove('hidden');
                paginationInfo.textContent = `Menampilkan ${loadedItemsTotal} dari ${new Intl.NumberFormat('id-ID').format(data.total)} Jurnal (Setiap Load menampilkan max 25 Jurnal)`;
            } else {
                paginationContainer.classList.add('hidden');
            }

        } catch (error) {
            if (!isLoadMore) {
                loadingState.classList.add('hidden');
                errorState.classList.remove('hidden');
                errorMessage.textContent = error.message;
            } else {
                alert(`Terdapat kendala saat memuat lebih banyak profil: ${error.message}`);
                loadMoreText.textContent = 'Tampilkan Selanjutnya (Next Page)';
                loadMoreSpinner.classList.add('hidden');
                loadMoreBtn.disabled = false;
            }
        }
    }

    // Helper untuk menghindari XSS
    function escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});
