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

// Desabilita cache para JS/CSS — garante que o browser sempre pega a versão mais nova
app.use((req, res, next) => {
    if (req.path.match(/\.(js|css)$/)) {
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
        const url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=pt-BR&page=1`;
        const response = await axios.get(url);
        const movies = (response.data.results || []).slice(0, 6).map(m => ({
            title: m.title,
            overview: m.overview,
            backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : '',
            releaseYear: m.release_date ? m.release_date.substring(0, 4) : '',
            voteAverage: m.vote_average ? m.vote_average.toFixed(1) : '',
            ageRating: ''
        }));
        res.json(movies);
    } catch (err) {
        console.error('TMDB Error:', err.message);
        res.json([]);
    }
});

// Proxy para a API JSON do Xtream
app.post('/api/xtream', async (req, res) => {
    const { serverUrl, username, password, action, extraParams } = req.body;
    
    if (!serverUrl || !username || !password) {
        return res.status(400).json({ error: 'Missing credentials' });
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
        console.error('API Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch from Xtream API' });
    }
});

// Proxy para o Streaming de Vídeo (Resolve CORS de .ts e .mp4)
app.get('/proxy-stream', async (req, res) => {
    const streamUrl = req.query.url;
    if (!streamUrl) {
        return res.status(400).send('Missing url parameter');
    }
    
    try {
        const response = await axios({
            method: 'get',
            url: streamUrl,
            responseType: 'stream',
            timeout: 10000
        });
        
        res.set('Access-Control-Allow-Origin', '*');
        if (response.headers['content-type']) {
            res.set('Content-Type', response.headers['content-type']);
        }
        
        response.data.pipe(res);
        
        req.on('close', () => {
            response.data.destroy();
        });
        
    } catch (error) {
        console.error('Stream Proxy Error:', error.message);
        res.status(500).send('Stream error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 WebPlayer Backend rodando em http://localhost:${PORT}`);
});
