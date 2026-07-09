const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Servir os arquivos estáticos do app Android
const assetsPath = path.join(__dirname, '..', 'app', 'src', 'main', 'assets');
app.use(express.static(assetsPath));

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
            timeout: 10000 // 10s timeout to connect
        });
        
        // Repassar os headers importantes
        res.set('Access-Control-Allow-Origin', '*');
        if (response.headers['content-type']) {
            res.set('Content-Type', response.headers['content-type']);
        }
        
        response.data.pipe(res);
        
        req.on('close', () => {
            response.data.destroy(); // Cancelar o stream se o cliente fechar
        });
        
    } catch (error) {
        console.error('Stream Proxy Error:', error.message);
        res.status(500).send('Stream error');
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 WebPlayer Backend rodando em http://localhost:${PORT}`);
});
