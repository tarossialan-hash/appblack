const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Resolve o caminho dos assets de forma flexível (funciona tanto localmente quanto no Render)
function findAssetsPath() {
    const candidates = [
        path.join(__dirname, '..', 'app', 'src', 'main', 'assets'), // Local (estrutura Android Studio)
        path.join(__dirname, 'assets'),                               // Render (pasta local)
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return candidates[0]; // fallback
}

const assetsPath = findAssetsPath();
console.log(`📁 Servindo assets de: ${assetsPath}`);

// Desabilita cache para JS/CSS/APIs — garante que o browser sempre pega a versão mais nova
app.use((req, res, next) => {
    if (req.path.match(/\.(js|css)$/) || req.path.startsWith('/api/')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});

app.use(express.static(assetsPath));

// Proxy TMDB — Filmes em Cartaz para o carrossel da Home
const TMDB_API_KEY = process.env.TMDB_API_KEY || ''; // Defina como variável de ambiente no Render
app.get('/api/tmdb/now-playing', async (req, res) => {
    if (!TMDB_API_KEY) {
        return res.json([]);
    }
    try {
        // Busca 3 páginas para ter candidatos suficientes após o filtro
        const pages = [1, 2, 3];
        const pageRequests = pages.map(p =>
            axios.get(`https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=pt-BR&page=${p}`)
                 .then(r => r.data.results || [])
                 .catch(() => [])
        );
        const pageResults = await Promise.all(pageRequests);
        const allMovies = pageResults.flat();

        // Processa todos os candidatos buscando logo de cada um
        const moviesWithData = await Promise.all(allMovies.map(async (m) => {
            // Pré-filtro rápido: precisa de backdrop e overview e nota mínima
            if (!m.backdrop_path || !m.overview || !m.vote_average || m.vote_average < 6.0) {
                return null;
            }

            let logoUrl = '';
            try {
                const imagesUrl = `https://api.themoviedb.org/3/movie/${m.id}/images?api_key=${TMDB_API_KEY}&include_image_language=pt,en,null,tr,es,fr,it,de,ja,ko,ru,zh`;
                const imagesRes = await axios.get(imagesUrl);
                const logos = imagesRes.data.logos || [];
                const bestLogo = logos.find(l => l.iso_639_1 === 'pt') ||
                                 logos.find(l => l.iso_639_1 === 'en') ||
                                 logos[0];
                if (bestLogo) {
                    logoUrl = `https://image.tmdb.org/t/p/w500${bestLogo.file_path}`;
                }
            } catch (err) {
                // sem logo → será descartado
            }

            // Filtro final: APENAS filmes com logo oficial, sinopse e avaliação
            if (!logoUrl) return null;

            return {
                id: m.id,
                title: m.title,
                overview: m.overview,
                backdropUrl: `https://image.tmdb.org/t/p/original${m.backdrop_path}`,
                posterPath: m.poster_path || '',
                logoUrl: logoUrl,
                releaseYear: m.release_date ? m.release_date.substring(0, 4) : '',
                voteAverage: m.vote_average ? m.vote_average.toFixed(1) : '',
                ageRating: ''
            };
        }));

        // Remove nulos e limita a 6 filmes completos
        const complete = moviesWithData.filter(Boolean).slice(0, 6);

        if (complete.length === 0) {
            return res.json([]);
        }

        res.json(complete);
    } catch (err) {
        console.error('TMDB Error: Failed to fetch trending movies');
        res.json([]);
    }
});

// Proxy TMDB — Busca Avançada de Filme por Nome para Destaques
app.get('/api/tmdb/search', async (req, res) => {
    const query = req.query.query;
    if (!TMDB_API_KEY || !query) {
        return res.json(null);
    }
    try {
        const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(query)}&page=1`;
        const searchRes = await axios.get(searchUrl);
        const result = (searchRes.data.results || []).find(r => r.media_type === 'movie' || r.media_type === 'tv');
        if (!result) {
            return res.json(null);
        }
        
        let logoUrl = '';
        try {
            const imagesUrl = `https://api.themoviedb.org/3/${result.media_type}/${result.id}/images?api_key=${TMDB_API_KEY}&include_image_language=pt,en,null,tr,es,fr,it,de,ja,ko,ru,zh`;
            const imagesRes = await axios.get(imagesUrl);
            const logos = imagesRes.data.logos || [];
            const bestLogo = logos.find(l => l.iso_639_1 === 'pt') || 
                             logos.find(l => l.iso_639_1 === 'en') || 
                             logos[0];
            if (bestLogo) {
                logoUrl = `https://image.tmdb.org/t/p/w500${bestLogo.file_path}`;
            }
        } catch (err) {
            console.error('Error fetching logo data');
        }

        res.json({
            id: result.id,
            title: result.title || result.name,
            overview: result.overview || '',
            backdropUrl: result.backdrop_path ? `https://image.tmdb.org/t/p/original${result.backdrop_path}` : '',
            posterPath: result.poster_path || '',
            logoUrl: logoUrl,
            releaseYear: (result.release_date || result.first_air_date || '').substring(0, 4),
            voteAverage: result.vote_average ? result.vote_average : 0
        });
    } catch (err) {
        console.error('Search TMDB Error: Failed to search TMDB');
        res.json(null);
    }
});

// Proxy para a API JSON do Xtream
function isValidXtreamUrl(serverUrl) {
    try {
        const url = new URL(serverUrl);
        // Only allow http/https
        if (!['http:', 'https:'].includes(url.protocol)) return false;
        // Reject private/internal IPs
        const hostname = url.hostname;
        if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname)) return false;
        if (hostname.startsWith('10.') || hostname.startsWith('172.16.') || hostname.startsWith('192.168.')) return false;
        return true;
    } catch (e) {
        return false;
    }
}

app.post('/api/xtream', async (req, res) => {
    const { serverUrl, username, password, action, extraParams } = req.body;

    if (!serverUrl || !username || !password) {
        return res.status(400).json({ error: 'Missing credentials' });
    }

    if (!isValidXtreamUrl(serverUrl)) {
        return res.status(400).json({ error: 'Invalid server URL' });
    }

    try {
        let target = `${serverUrl}/player_api.php?username=${username}&password=${password}`;
        if (action) target += `&action=${action}`;

        if (extraParams) {
            const params = new URLSearchParams(extraParams);
            target += `&${params.toString()}`;
        }

        const response = await axios.get(target);
        res.json(response.data);
    } catch (error) {
        console.error('API Error: Failed to fetch from Xtream API');
        res.status(500).json({ error: 'Failed to fetch from Xtream API' });
    }
});

function isValidStreamUrl(streamUrl) {
    try {
        const url = new URL(streamUrl);
        // Only allow http/https
        if (!['http:', 'https:'].includes(url.protocol)) return false;
        // Reject private/internal IPs
        const hostname = url.hostname;
        if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname)) return false;
        if (hostname.startsWith('10.') || hostname.startsWith('172.16.') || hostname.startsWith('192.168.')) return false;
        return true;
    } catch (e) {
        return false;
    }
}

app.get('/proxy-stream', async (req, res) => {
    const streamUrl = req.query.url;
    if (!streamUrl) {
        return res.status(400).send('Missing url parameter');
    }

    if (!isValidStreamUrl(streamUrl)) {
        return res.status(403).send('Invalid or restricted URL');
    }

    const headers = {};
    if (req.headers.range) {
        headers['Range'] = req.headers.range;
    }

    try {
        const response = await axios({
            method: 'get',
            url: streamUrl,
            headers: headers,
            responseType: 'stream',
            timeout: 15000,
            validateStatus: (status) => status >= 200 && status < 300
        });

        res.set('Access-Control-Allow-Origin', '*');
        res.set('Accept-Ranges', 'bytes');

        if (response.headers['content-type']) {
            res.set('Content-Type', response.headers['content-type']);
        }
        if (response.headers['content-range']) {
            res.set('Content-Range', response.headers['content-range']);
        }
        if (response.headers['content-length']) {
            res.set('Content-Length', response.headers['content-length']);
        }

        res.status(response.status);
        response.data.pipe(res);

        req.on('close', () => {
            response.data.destroy();
        });

    } catch (error) {
        console.error('Stream Proxy Error: Failed to fetch stream');
        try {
            const fallbackResponse = await axios({
                method: 'get',
                url: streamUrl,
                responseType: 'stream',
                timeout: 10000
            });
            res.set('Access-Control-Allow-Origin', '*');
            if (fallbackResponse.headers['content-type']) {
                res.set('Content-Type', fallbackResponse.headers['content-type']);
            }
            fallbackResponse.data.pipe(res);
            req.on('close', () => {
                fallbackResponse.data.destroy();
            });
        } catch (err) {
            res.status(500).send('Stream error');
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 WebPlayer Backend rodando em http://localhost:${PORT}`);
});
