const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 3000;
// Absoluto: o servidor roda de qualquer diretório
const ASSETS = path.join(__dirname, '..', '..', 'app', 'src', 'main', 'assets');
// O web-bridge vive fora de assets/ de propósito — no APK ele seria peso morto,
// já que o AndroidApp real é injetado pelo WebView. Aqui no browser ele é o
// substituto, então o servidor o entrega e injeta a tag só nesta versão de dev.
const WEB_BRIDGE = path.join(__dirname, 'web-bridge.js');
// Mesma key usada pelo app nativo (NetworkModule.kt)
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'e8a5a7a31529ab1a19de1ffb7a09b0b5';

// ---------- Helpers ----------
function isValidRemoteUrl(rawUrl) {
    try {
        const u = new URL(rawUrl);
        if (!['http:', 'https:'].includes(u.protocol)) return false;
        const h = u.hostname;
        if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(h)) return false;
        if (h.startsWith('10.') || h.startsWith('172.16.') || h.startsWith('192.168.')) return false;
        return true;
    } catch (e) {
        return false;
    }
}

// User-Agent que servidores Xtream/IPTV costumam aceitar
const XTREAM_UA = 'IPTVSmarters/1.0 (okhttp/4.9.0)';

// GET remoto seguindo redirects, retorna body como string
function fetchJson(targetUrl, redirects = 0) {
    return new Promise((resolve, reject) => {
        if (redirects > 5) return reject(new Error('Too many redirects'));
        const lib = targetUrl.startsWith('https') ? https : http;
        const opts = { timeout: 15000, headers: { 'User-Agent': XTREAM_UA, 'Accept': '*/*' } };
        lib.get(targetUrl, opts, (r) => {
            if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
                const next = new URL(r.headers.location, targetUrl).toString();
                r.resume();
                return resolve(fetchJson(next, redirects + 1));
            }
            let data = '';
            r.on('data', c => data += c);
            r.on('end', () => resolve(data));
        }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
    });
}

function readBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); }
            catch (e) { resolve({}); }
        });
    });
}

function sendJson(res, code, obj) {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
}

// ---------- Server ----------
http.createServer(async (req, res) => {
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = urlObj.pathname;

    // === Proxy Xtream ===
    if (pathname === '/api/xtream' && req.method === 'POST') {
        const { serverUrl, username, password, action, extraParams } = await readBody(req);
        if (!serverUrl || !username || !password) return sendJson(res, 400, { error: 'Missing credentials' });
        if (!isValidRemoteUrl(serverUrl)) return sendJson(res, 400, { error: 'Invalid server URL' });

        let base = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
        let target = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        if (action) target += `&action=${encodeURIComponent(action)}`;
        if (extraParams) {
            for (const [k, v] of Object.entries(extraParams)) {
                target += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
            }
        }
        try {
            const data = await fetchJson(target);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        } catch (e) {
            console.error('Xtream proxy error:', e.message);
            sendJson(res, 500, { error: 'Failed to fetch from Xtream API' });
        }
        return;
    }

    // === Proxy TMDB: melhor logo (pt > en > primeiro) ===
    async function fetchBestLogo(mediaType, id) {
        try {
            const imagesUrl = `https://api.themoviedb.org/3/${mediaType}/${id}/images?api_key=${TMDB_API_KEY}&include_image_language=pt,en,null,tr,es,fr,it,de,ja,ko,ru,zh`;
            const imgs = JSON.parse(await fetchJson(imagesUrl));
            const logos = imgs.logos || [];
            const best = logos.find(l => l.iso_639_1 === 'pt') || logos.find(l => l.iso_639_1 === 'en') || logos[0];
            return best ? `https://image.tmdb.org/t/p/w500${best.file_path}` : '';
        } catch (e) {
            return '';
        }
    }

    // === Proxy TMDB: Filmes em cartaz para o carrossel da Home ===
    if (pathname === '/api/tmdb/now-playing') {
        try {
            const pages = [1, 2, 3];
            const pageResults = await Promise.all(pages.map(p =>
                fetchJson(`https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=pt-BR&page=${p}`)
                    .then(d => JSON.parse(d).results || [])
                    .catch(() => [])
            ));
            const allMovies = pageResults.flat();

            const withData = await Promise.all(allMovies.map(async (m) => {
                if (!m.backdrop_path || !m.overview || !m.vote_average || m.vote_average < 6.0) return null;
                const logoUrl = await fetchBestLogo('movie', m.id);
                if (!logoUrl) return null;

                // Detalhes para duração, país e gênero (linha de metadados do banner)
                let runtime = '', country = '', genres = '';
                try {
                    const det = JSON.parse(await fetchJson(
                        `https://api.themoviedb.org/3/movie/${m.id}?api_key=${TMDB_API_KEY}&language=pt-BR`));
                    if (det.runtime > 0) {
                        const h = Math.floor(det.runtime / 60);
                        const mm = det.runtime % 60;
                        runtime = h > 0 ? `${h}h ${mm}m` : `${mm}m`;
                    }
                    country = (det.production_countries || [])[0]?.iso_3166_1 || '';
                    genres = (det.genres || []).slice(0, 2).map(g => g.name).join(', ');
                } catch (e) { /* segue sem esses campos */ }

                return {
                    id: m.id,
                    title: m.title,
                    overview: m.overview,
                    backdropUrl: `https://image.tmdb.org/t/p/original${m.backdrop_path}`,
                    posterPath: m.poster_path || '',
                    logoUrl: logoUrl,
                    releaseYear: m.release_date ? m.release_date.substring(0, 4) : '',
                    voteAverage: m.vote_average ? m.vote_average.toFixed(1) : '',
                    ageRating: '',
                    mediaType: 'movie',
                    typeLabel: 'Filme',
                    releaseDate: m.release_date || '',
                    runtime: runtime,
                    country: country,
                    genres: genres
                };
            }));
            const complete = withData.filter(Boolean).slice(0, 6);
            return sendJson(res, 200, complete);
        } catch (e) {
            console.error('TMDB now-playing error:', e.message);
            return sendJson(res, 200, []);
        }
    }

    // === Proxy TMDB: Busca por nome (destaques) ===
    if (pathname === '/api/tmdb/search') {
        const query = urlObj.searchParams.get('query');
        if (!query) return sendJson(res, 200, null);
        try {
            const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(query)}&page=1`;
            const data = JSON.parse(await fetchJson(searchUrl));
            const result = (data.results || []).find(r => r.media_type === 'movie' || r.media_type === 'tv');
            if (!result) return sendJson(res, 200, null);

            const ehSerie = result.media_type === 'tv';
            const logoUrl = await fetchBestLogo(result.media_type, result.id);

            // Mesmos campos que o app nativo expõe em getBannerItems, para a
            // linha de metadados ficar idêntica no browser e no Android TV.
            let runtime = '', country = '', genres = '';
            try {
                const det = JSON.parse(await fetchJson(
                    `https://api.themoviedb.org/3/${result.media_type}/${result.id}?api_key=${TMDB_API_KEY}&language=pt-BR`));

                const minutos = ehSerie
                    ? ((det.episode_run_time || [])[0] || 0)
                    : (det.runtime || 0);
                if (minutos > 0) {
                    const h = Math.floor(minutos / 60);
                    const mm = minutos % 60;
                    runtime = h > 0 ? `${h}h ${mm}m` : `${mm}m`;
                }

                country = ehSerie
                    ? ((det.origin_country || [])[0] || '')
                    : ((det.production_countries || [])[0]?.iso_3166_1 || '');

                genres = (det.genres || []).slice(0, 2).map(g => g.name).join(', ');
            } catch (e) { /* segue sem esses campos */ }

            return sendJson(res, 200, {
                id: result.id,
                title: result.title || result.name,
                overview: result.overview || '',
                backdropUrl: result.backdrop_path ? `https://image.tmdb.org/t/p/original${result.backdrop_path}` : '',
                posterPath: result.poster_path || '',
                logoUrl: logoUrl,
                releaseYear: (result.release_date || result.first_air_date || '').substring(0, 4),
                voteAverage: result.vote_average || 0,
                mediaType: result.media_type,
                typeLabel: ehSerie ? 'Série' : 'Filme',
                releaseDate: result.release_date || result.first_air_date || '',
                runtime: runtime,
                country: country,
                genres: genres
            });
        } catch (e) {
            return sendJson(res, 200, null);
        }
    }

    // === Proxy de streaming (.ts / .mp4) ===
    // O web-bridge roteia o vídeo por aqui no modo browser, para contornar CORS.
    // Precisa seguir redirects: o Xtream responde 302 apontando para o servidor de mídia.
    if (pathname === '/proxy-stream') {
        const streamUrl = urlObj.searchParams.get('url');
        if (!streamUrl) {
            res.writeHead(400);
            return res.end('Missing url parameter');
        }
        if (!isValidRemoteUrl(streamUrl)) {
            res.writeHead(403);
            return res.end('Invalid or restricted URL');
        }

        const encaminhar = (target, redirects = 0) => {
            if (redirects > 5) {
                if (!res.headersSent) { res.writeHead(502); res.end('Too many redirects'); }
                return;
            }
            const lib = target.startsWith('https') ? https : http;
            const headers = { 'User-Agent': XTREAM_UA };
            if (req.headers.range) headers['Range'] = req.headers.range;

            const upstream = lib.get(target, { headers, timeout: 20000 }, (r) => {
                if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
                    const next = new URL(r.headers.location, target).toString();
                    r.resume();
                    return encaminhar(next, redirects + 1);
                }
                const saida = { 'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes' };
                if (r.headers['content-type'])   saida['Content-Type'] = r.headers['content-type'];
                if (r.headers['content-length']) saida['Content-Length'] = r.headers['content-length'];
                if (r.headers['content-range'])  saida['Content-Range'] = r.headers['content-range'];
                res.writeHead(r.statusCode, saida);
                r.pipe(res);
                req.on('close', () => r.destroy());
            });

            upstream.on('error', (e) => {
                console.error('proxy-stream erro:', e.message);
                if (!res.headersSent) { res.writeHead(502); res.end('Stream error'); }
            });
            upstream.on('timeout', function () { this.destroy(new Error('timeout')); });
        };

        encaminhar(streamUrl);
        return;
    }

    // === web-bridge.js: mora em scripts/dev/, não em assets/ ===
    if (pathname === '/web-bridge.js') {
        return fs.readFile(WEB_BRIDGE, (err, data) => {
            if (err) { res.writeHead(404); return res.end('web-bridge.js não encontrado'); }
            res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
            res.end(data);
        });
    }

    // === Static files ===
    let filePath = pathname === '/' ? '/index.html' : pathname;
    let file = path.join(ASSETS, filePath);

    fs.readFile(file, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('404');
            return;
        }
        let type = 'text/html';
        if (file.endsWith('.js')) type = 'application/javascript';
        if (file.endsWith('.css')) type = 'text/css';
        if (file.endsWith('.png')) type = 'image/png';
        if (file.endsWith('.mp4')) type = 'video/mp4';

        // Injeta o bridge antes do app.js. Só aqui — o index.html em disco
        // (o que vai no APK) continua sem esta tag.
        if (file.endsWith('index.html')) {
            const html = data.toString('utf8');
            const alvo = '<script src="app.js';
            if (html.includes(alvo) && !html.includes('web-bridge.js')) {
                data = Buffer.from(
                    html.replace(alvo, '<script src="web-bridge.js"></script>\n    ' + alvo),
                    'utf8'
                );
            }
        }

        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
        res.end(data);
    });
}).listen(PORT, () => {
    console.log(`\n🌐 http://localhost:${PORT}`);
    console.log(`   Proxy Xtream: POST /api/xtream ${TMDB_API_KEY ? '' : '(TMDB desativado, sem key)'}\n`);
});
