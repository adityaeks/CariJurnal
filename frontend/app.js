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
    let cumulativeYearStats = {};

    // Theme Toggle Logic
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeToggleDarkIcon = document.getElementById('themeToggleDarkIcon');
    const themeToggleLightIcon = document.getElementById('themeToggleLightIcon');

    function updateThemeIcons() {
        if (document.documentElement.classList.contains('dark')) {
            themeToggleLightIcon.classList.remove('hidden');
            themeToggleDarkIcon.classList.add('hidden');
        } else {
            themeToggleLightIcon.classList.add('hidden');
            themeToggleDarkIcon.classList.remove('hidden');
        }
    }
    
    if (themeToggleBtn) {
        updateThemeIcons();
        themeToggleBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            if (document.documentElement.classList.contains('dark')) {
                localStorage.setItem('color-theme', 'dark');
            } else {
                localStorage.setItem('color-theme', 'light');
            }
            updateThemeIcons();
        });
    }

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
        
        // Render Insight immediately (parallel)
        fetchInsightData(qs);

        await performSearch(false);
    });

    loadMoreBtn.addEventListener('click', async () => {
        if (!currentQs) return;
        currentStart += 25; // API Default Scopus membatasi fetch 25 items (max 200 via view=STANDARD)
        
        // Update Insight in parallel for the new page
        fetchInsightData(currentQs, currentStart, true);
        
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
                card.className = 'bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md hover:border-blue-200 dark:hover:border-slate-500 transition-all group flex flex-col gap-4';
                
                const safeTitle = escapeHTML(item.title) || 'Tanpa Judul';
                const safeAuthor = escapeHTML(item.author) || 'Author tidak diketahui';
                const safeSource = escapeHTML(item.sourceTitle) || 'Sumber tidak diketahui';
                const year = escapeHTML(item.year);
                const cited = item.citedBy;
                const safeDoi = escapeHTML(item.doi);

                const doiHtml = safeDoi 
                    ? `<p class="text-slate-600 dark:text-slate-400 text-sm mb-3">
                           <span class="font-medium text-slate-700 dark:text-slate-300">🔗 DOI:</span> <a href="https://doi.org/${safeDoi}" target="_blank" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors">${safeDoi}</a>
                       </p>`
                    : '';

                card.innerHTML = `
                    <div class="flex flex-col sm:flex-row justify-between sm:items-start gap-4 w-full">
                        <div class="flex-grow">
                            <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100 leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">${safeTitle}</h3>
                            <p class="text-slate-600 dark:text-slate-400 text-sm mb-1">
                                <span class="font-medium text-slate-700 dark:text-slate-300">👨‍🔬 Author:</span> ${safeAuthor}
                            </p>
                            <p class="text-slate-600 dark:text-slate-400 text-sm mb-2">
                                <span class="font-medium text-slate-700 dark:text-slate-300">📝 Publikasi:</span> <span class="italic font-medium">${safeSource}</span> (${year})
                            </p>
                            ${doiHtml}
                            <div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 mt-1">
                                ⭐ Sitasi: ${cited}
                            </div>
                        </div>
                        <div class="flex-shrink-0 pt-1 flex flex-col gap-3 w-full sm:w-auto">
                            <a href="${item.scopusLink}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center sm:justify-start px-4 py-2 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors group-hover:border-blue-300 dark:group-hover:border-blue-400">
                                <svg class="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Buka di Scopus
                            </a>
                            
                            <select class="citation-select w-full sm:w-auto px-3 py-2 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors cursor-pointer outline-none">
                                <option value="">Format Sitasi...</option>
                                <option value="apa">APA</option>
                                <option value="mla">MLA</option>
                                <option value="ieee">IEEE</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="citation-output-container hidden pt-3 border-t border-slate-200 dark:border-slate-700 w-full">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Hasil Sitasi:</span>
                            <button class="copy-citation-btn text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 px-2.5 py-1.5 rounded-md transition-colors flex items-center border border-blue-200 dark:border-blue-800">
                                <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                Copy
                            </button>
                        </div>
                        <div class="citation-text text-sm text-slate-600 dark:text-slate-400 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 selection:bg-blue-200 selection:text-blue-900 leading-relaxed font-mono"></div>
                    </div>
                `;

                // Logic format citation & copy
                const selectElement = card.querySelector('.citation-select');
                const outputContainer = card.querySelector('.citation-output-container');
                const citationTextElement = card.querySelector('.citation-text');
                const copyBtn = card.querySelector('.copy-citation-btn');

                let currentCitationText = '';

                selectElement.addEventListener('change', (e) => {
                    const format = e.target.value;
                    if (!format) {
                        outputContainer.classList.add('hidden');
                        return;
                    }

                    outputContainer.classList.remove('hidden');
                    let citation = '';
                    const doiStr = safeDoi ? ' https://doi.org/' + safeDoi : '';

                    if (format === 'apa') {
                        citation = `${safeAuthor} (${year}). ${safeTitle}. ${safeSource}.${doiStr}`;
                    } else if (format === 'mla') {
                        citation = `${safeAuthor}. "${safeTitle}." ${safeSource}, ${year}.${doiStr}`;
                    } else if (format === 'ieee') {
                        citation = `${safeAuthor}, "${safeTitle}," ${safeSource}, ${year}.${safeDoi ? ' doi: ' + safeDoi : ''}`;
                    }

                    currentCitationText = citation;
                    citationTextElement.textContent = citation;
                    
                    // Reset copy button
                    copyBtn.innerHTML = '<svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>Copy';
                });

                copyBtn.addEventListener('click', () => {
                    if (currentCitationText) {
                        navigator.clipboard.writeText(currentCitationText).then(() => {
                            copyBtn.innerHTML = '<svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Copied!';
                            setTimeout(() => {
                                copyBtn.innerHTML = '<svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>Copy';
                            }, 2000);
                        }).catch(err => {
                            console.error('Failed to copy citation: ', err);
                        });
                    }
                });

                resultsList.appendChild(card);
            });

            // Calculate pagination logic to decide if we show NEXT PAGE btn
            const loadedItemsTotal = currentStart + data.results.length;
            const currentDisplayCount = document.getElementById('currentDisplayCount');
            const initialNotice = document.getElementById('initialNotice');

            if (currentDisplayCount) currentDisplayCount.textContent = loadedItemsTotal;
            if (loadedItemsTotal >= data.total) {
                if (initialNotice) initialNotice.textContent = `(Semua ${loadedItemsTotal} hasil sudah ditampilkan).`;
            } else {
                if (initialNotice) initialNotice.textContent = `(Menampilkan ${loadedItemsTotal} hasil pertama. Klik tombol di bawah untuk melihat selebihnya).`;
            }

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
    
    // Insight Functionality
    async function fetchInsightData(qs, start = 0, isLoadMore = false) {
        const insightLoading = document.getElementById('insightLoading');
        const yearListContainer = document.getElementById('yearListContainer');
        
        // UI Reset only on new search
        if (!isLoadMore) {
            insightLoading.classList.remove('hidden');
            cumulativeYearStats = {};
            yearListContainer.innerHTML = '';
        }
        
        try {
            const url = `/api/insight?${qs.toString()}&start=${start}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('API return error');
            
            const data = await response.json();
            
            // Merge new stats into cumulative stats
            for (const year in data.yearStats) {
                cumulativeYearStats[year] = (cumulativeYearStats[year] || 0) + data.yearStats[year];
            }
            
            // Re-render the compiled list
            yearListContainer.innerHTML = '';
            const sortedYears = Object.keys(cumulativeYearStats).sort((a, b) => b - a); // Descending year
            
            // Update the total data count badge
            const totalSampleCount = Object.values(cumulativeYearStats).reduce((sum, val) => sum + val, 0);
            const insightDataCount = document.getElementById('insightDataCount');
            if (totalSampleCount > 0) {
                insightDataCount.textContent = `${totalSampleCount} data`;
                insightDataCount.classList.remove('hidden');
            } else {
                insightDataCount.classList.add('hidden');
            }
            
            for (const year of sortedYears) {
                const count = cumulativeYearStats[year];
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0 last:pb-0 transition-all duration-300';
                li.innerHTML = `
                    <span class="font-medium text-slate-800 dark:text-slate-200">${escapeHTML(year)}</span>
                    <span class="font-semibold text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-700 px-3 py-0.5 rounded-full text-xs">${count}</span>
                `;
                yearListContainer.appendChild(li);
            }
            
            if (sortedYears.length === 0 && !isLoadMore) {
                yearListContainer.innerHTML = '<li class="text-slate-400 italic text-xs text-center py-4">Belum ada data jurnal ditemukan.</li>';
            }
            
            // UI Show Result
            insightLoading.classList.add('hidden');
            
        } catch (error) {
            console.error("Failed to fetch insight data:", error);
            insightLoading.classList.add('hidden');
            if (!isLoadMore) {
                yearListContainer.innerHTML = '<li class="text-red-500 italic text-xs text-center py-4">Gagal memuat data statistik.</li>';
            }
        }
    }


    // Back to Top Button Logic
    const backToTopBtn = document.getElementById('backToTopBtn');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            backToTopBtn.classList.remove('translate-y-20', 'opacity-0');
            backToTopBtn.classList.add('translate-y-0', 'opacity-100');
        } else {
            backToTopBtn.classList.add('translate-y-20', 'opacity-0');
            backToTopBtn.classList.remove('translate-y-0', 'opacity-100');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

});
