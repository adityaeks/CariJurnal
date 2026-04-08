const axios = require('axios');

async function searchScopus(req, res) {
    try {
        const { q, sort = 'relevancy', start = 0, authors, yearStart, yearEnd, affiliations, pubName, issn, titleWords, keywords } = req.query;
        
        const queryParts = [];
        
        // Membangun format Scopus Query secara otomatis
        if (q) queryParts.push(`TITLE-ABS-KEY(${q})`);
        if (titleWords) queryParts.push(`TITLE(${titleWords})`);
        if (authors) queryParts.push(`AUTH(${authors})`);
        if (affiliations) queryParts.push(`AFFIL(${affiliations})`);
        if (pubName) queryParts.push(`SRCTITLE(${pubName})`);
        if (issn) queryParts.push(`ISSN(${issn})`);
        if (keywords) queryParts.push(`KEY(${keywords})`);

        if (yearStart && yearEnd) {
            queryParts.push(`PUBYEAR > ${parseInt(yearStart)-1} AND PUBYEAR < ${parseInt(yearEnd)+1}`);
        } else if (yearStart) {
            queryParts.push(`PUBYEAR > ${parseInt(yearStart)-1}`);
        } else if (yearEnd) {
            queryParts.push(`PUBYEAR < ${parseInt(yearEnd)+1}`);
        }

        if (req.query.oa === 'true') {
            queryParts.push(`OPENACCESS(1)`);
        }

        const finalQuery = queryParts.length > 0 ? queryParts.join(' AND ') : '';

        if (!finalQuery) {
            return res.status(400).json({ error: 'Harap isikan setidaknya satu kriteria pencarian' });
        }

        // Map sort frontend to Scopus API sort param
        // Scopus sort options: 
        // relevancy -> relevancy
        // citedby-count -> +citedby-count (asc) or -citedby-count (desc)
        // coverDate -> -coverDate (newest) or +coverDate (oldest)
        let scopusSort = 'relevancy';
        if (sort === 'year') scopusSort = '-coverDate';
        if (sort === 'citation') scopusSort = '-citedby-count';

        const apiKey = process.env.SCOPUS_API_KEY;
        if (!apiKey || apiKey === 'your_api_key_here') {
             return res.status(500).json({ error: 'API Key Scopus belum dikonfigurasi di file .env' });
        }

        console.log(`Searching Scopus with query: "${finalQuery}", Sort: ${scopusSort}`);

        const response = await axios.get('https://api.elsevier.com/content/search/scopus', {
            headers: {
                'X-ELS-APIKey': apiKey,
                'Accept': 'application/json'
            },
            params: {
                query: finalQuery,
                count: 25,
                start: start,
                sort: scopusSort
            }
        });

        const data = response.data['search-results'];
        if (!data || !data.entry) {
            return res.json({ total: 0, results: [] });
        }

        const totalResults = data['opensearch:totalResults'];

        // Backend mapping - Clean the response for the frontend
        const results = data.entry.map(item => {
            // Identifier / EID handling
            const eid = item.eid; // e.g. "2-s2.0-850..."
            const scopusLink = `https://www.scopus.com/record/display.uri?eid=${eid}`;

            return {
                title: item['dc:title'],
                author: item['dc:creator'],
                year: item['prism:coverDate'] ? item['prism:coverDate'].substring(0, 4) : 'N/A',
                sourceTitle: item['prism:publicationName'],
                citedBy: item['citedby-count'] || 0,
                scopusLink: scopusLink,
                eid: eid,
                doi: item['prism:doi'] || ''
            };
        });

        res.json({
            total: totalResults,
            start: start,
            results: results
        });

    } catch (error) {
        console.error('Error fetching Scopus data:', error.response?.data || error.message);
        if (error.response && error.response.status === 429) {
            return res.status(429).json({ error: 'Limit API Scopus (Elsevier) telah melampaui batas (HTTP 429). Silakan coba lagi nanti atau ganti API Key.' });
        } else if (error.response && error.response.status === 400) {
            return res.status(400).json({ error: 'Validasi pencarian gagal dari Elsevier (400 Bad Request). Cek kembali kata kunci Anda.' });
        }
        res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data dari Scopus API' });
    }
}

async function getScopusInsight(req, res) {
    try {
        const { q, sort = 'relevancy', start = 0, authors, yearStart, yearEnd, affiliations, pubName, issn, titleWords, keywords } = req.query;
        
        const queryParts = [];
        if (q) queryParts.push(`TITLE-ABS-KEY(${q})`);
        if (titleWords) queryParts.push(`TITLE(${titleWords})`);
        if (authors) queryParts.push(`AUTH(${authors})`);
        if (affiliations) queryParts.push(`AFFIL(${affiliations})`);
        if (pubName) queryParts.push(`SRCTITLE(${pubName})`);
        if (issn) queryParts.push(`ISSN(${issn})`);
        if (keywords) queryParts.push(`KEY(${keywords})`);

        if (yearStart && yearEnd) {
            queryParts.push(`PUBYEAR > ${parseInt(yearStart)-1} AND PUBYEAR < ${parseInt(yearEnd)+1}`);
        } else if (yearStart) {
            queryParts.push(`PUBYEAR > ${parseInt(yearStart)-1}`);
        } else if (yearEnd) {
            queryParts.push(`PUBYEAR < ${parseInt(yearEnd)+1}`);
        }

        if (req.query.oa === 'true') {
            queryParts.push(`OPENACCESS(1)`);
        }

        const finalQuery = queryParts.length > 0 ? queryParts.join(' AND ') : '';

        if (!finalQuery) {
            return res.status(400).json({ error: 'Harap isikan setidaknya satu kriteria pencarian' });
        }

        const apiKey = process.env.SCOPUS_API_KEY;
        if (!apiKey || apiKey === 'your_api_key_here') {
             return res.status(500).json({ error: 'API Key Scopus belum dikonfigurasi di file .env' });
        }

        let scopusSort = 'relevancy';
        if (sort === 'year') scopusSort = '-coverDate';
        if (sort === 'citation') scopusSort = '-citedby-count';

        // Fetch 25 entries (Max limit allowed for your standard API tier without view: 'COMPLETE')
        const response = await axios.get('https://api.elsevier.com/content/search/scopus', {
            headers: {
                'X-ELS-APIKey': apiKey,
                'Accept': 'application/json'
            },
            params: {
                query: finalQuery,
                count: 25, // Maximum threshold for standard tier without Exceeds Maximum limit error
                start: start,
                sort: scopusSort // Must match the search display's sorting
            }
        });

        const data = response.data['search-results'];
        if (!data || !data.entry) {
            return res.json({ total: 0, yearStats: {}, journalStats: {}, avgAuthor: 0, openAccess: { yes: 0, no: 0 } });
        }

        const entries = data.entry;
        const total = entries.length;

        const yearStats = {};
        const journalStatsMap = {};
        let totalAuthors = 0;
        let openAccessYes = 0;
        let openAccessNo = 0;

        entries.forEach(item => {
            // 1. Year
            const year = item['prism:coverDate'] ? item['prism:coverDate'].substring(0, 4) : 'Unknown';
            yearStats[year] = (yearStats[year] || 0) + 1;

            // 2. Journal/Source name
            const journal = item['prism:publicationName'] || 'Unknown Source';
            journalStatsMap[journal] = (journalStatsMap[journal] || 0) + 1;

            // 3. Authors
            if (item['author'] && Array.isArray(item['author'])) {
                totalAuthors += item['author'].length;
            } else if (item['dc:creator']) {
                // Sometime dc:creator is a string with comma separated names, usually count by comma + 1
                totalAuthors += item['dc:creator'].split(',').length;
            } else {
                totalAuthors += 1; // Assuming at least 1 author if not specified clearly but journal exists
            }

            // 4. Open Access
            if (item['openaccess'] == '1' || item['openaccess'] === true || item['openaccess'] === 'true') {
                openAccessYes++;
            } else {
                openAccessNo++;
            }
        });

        // Get Top 5 Journals
        const sortedJournals = Object.entries(journalStatsMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .reduce((obj, [key, val]) => {
                obj[key] = val;
                return obj;
            }, {});

        const avgAuthor = total > 0 ? (totalAuthors / total).toFixed(1) : 0;

        res.json({
            total: total,
            yearStats,
            journalStats: sortedJournals,
            avgAuthor: parseFloat(avgAuthor),
            openAccess: {
                yes: openAccessYes,
                no: openAccessNo
            }
        });

    } catch (error) {
        console.error('Error fetching Scopus insight data:', error.response?.data || error.message);
        res.status(500).json({ error: 'Terjadi kesalahan saat mengambil insight dari Scopus API' });
    }
}

module.exports = {
    searchScopus,
    getScopusInsight
};
