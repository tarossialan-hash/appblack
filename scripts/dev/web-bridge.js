class WebBridge {
    constructor() {
        this.serverUrl = localStorage.getItem('wb_url') || '';
        this.username = localStorage.getItem('wb_user') || '';
        this.password = localStorage.getItem('wb_pass') || '';
        this.movies = null;
        this.series = null;
        this.searchDataPromise = null;
        // Versão do webplayer = versão do código servido. "Atualizar" no web é
        // o deploy de um código novo no servidor; ao recarregar, o usuário pega
        // esta versão. Bumpar aqui é o equivalente web ao "lançar" uma versão.
        localStorage.removeItem('wb_simulated_version');
        this.simulatedVersion = "1.0.1";

        // Se já tiver credenciais salvas, começa a buscar em segundo plano
        if (this.serverUrl && this.username && this.password) {
            this.preloadSearchData();
        }
    }

    preloadSearchData() {
        if (this.movies && this.series) return Promise.resolve();
        if (this.searchDataPromise) return this.searchDataPromise;

        console.log("🌐 WebBridge: Iniciando pré-carregamento dos dados de busca em segundo plano...");
        
        this.searchDataPromise = Promise.all([
            this._apiCall('get_vod_streams').then(data => {
                if (data && Array.isArray(data)) {
                    this.movies = data.map(c => ({
                        id: c.stream_id,
                        name: c.name,
                        streamIcon: c.stream_icon,
                        rating: c.rating,
                        type: 'movie'
                    }));
                    console.log(`🌐 WebBridge: ${this.movies.length} filmes carregados para busca.`);
                }
            }).catch(e => console.error("Erro ao carregar filmes para busca:", e)),
            
            this._apiCall('get_series').then(data => {
                if (data && Array.isArray(data)) {
                    this.series = data.map(c => ({
                        id: c.series_id,
                        name: c.name,
                        streamIcon: c.cover,
                        rating: c.rating,
                        type: 'series'
                    }));
                    console.log(`🌐 WebBridge: ${this.series.length} séries carregadas para busca.`);
                }
            }).catch(e => console.error("Erro ao carregar séries para busca:", e))
        ]).then(() => {
            console.log("🌐 WebBridge: Pré-carregamento dos dados de busca finalizado com sucesso.");
        });

        return this.searchDataPromise;
    }

    async _apiCall(action, extraParams = {}) {
        try {
            const response = await fetch('/api/xtream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serverUrl: this.serverUrl,
                    username: this.username,
                    password: this.password,
                    action: action,
                    extraParams: extraParams
                })
            });
            return await response.json();
        } catch (e) {
            console.error('WebBridge API Error:', e);
            return null;
        }
    }

    login(username, password) {
        // Usa a URL padrão do app nativo
        let url = this.serverUrl || 'http://bkpac.cc';
        if (url.endsWith('/')) url = url.slice(0, -1);
        
        this.serverUrl = url;
        this.username = username;
        this.password = password;
        
        if (typeof updateSyncProgress === 'function') {
            updateSyncProgress(10, "Conectando...");
        }

        this._apiCall('').then(data => {
            if (data && data.user_info && data.user_info.auth === 1) {
                // Salvar credenciais localmente
                localStorage.setItem('wb_url', url);
                localStorage.setItem('wb_user', username);
                localStorage.setItem('wb_pass', password);
                
                // Simula um progresso rápido para o WebPlayer
                let p = 20;
                let iv = setInterval(() => {
                    p += 20;
                    if (typeof updateSyncProgress === 'function') updateSyncProgress(p, "Sincronizando...");
                    if (p >= 100) {
                        clearInterval(iv);
                        this.preloadSearchData(); // Carrega dados de busca em segundo plano
                        if (typeof onLoginSuccess === 'function') onLoginSuccess(JSON.stringify(data.user_info));
                    }
                }, 150);
            } else {
                if (typeof onLoginError === 'function') {
                    onLoginError("Usuário ou senha inválidos.");
                }
            }
        });
    }

    getLiveCategories() {
        this._apiCall('get_live_categories').then(data => {
            if (data && Array.isArray(data)) {
                const mapped = data.map(c => ({
                    categoryId: c.category_id,
                    categoryName: c.category_name
                }));
                if (typeof onLiveCategoriesLoaded === 'function') {
                    onLiveCategoriesLoaded(JSON.stringify(mapped));
                }
            }
        });
    }

    getLiveChannels(categoryId) {
        this._apiCall('get_live_streams', { category_id: categoryId }).then(data => {
            if (data && Array.isArray(data)) {
                const mapped = data.map(c => ({
                    streamId: c.stream_id,
                    name: c.name,
                    streamIcon: c.stream_icon,
                    epgChannelId: c.epg_channel_id
                }));
                if (typeof onLiveChannelsLoaded === 'function') {
                    onLiveChannelsLoaded(JSON.stringify(mapped));
                }
            }
        });
    }

    getVodCategories() {
        this._apiCall('get_vod_categories').then(data => {
            if (data && Array.isArray(data)) {
                const mapped = data.map(c => ({
                    categoryId: c.category_id,
                    categoryName: c.category_name
                }));
                if (typeof onVodCategoriesLoaded === 'function') {
                    onVodCategoriesLoaded(JSON.stringify(mapped));
                }
            }
        });
    }

    getVodList(categoryId) {
        this._apiCall('get_vod_streams', { category_id: categoryId }).then(data => {
            if (data && Array.isArray(data)) {
                const mapped = data.map(c => ({
                    streamId: c.stream_id,
                    name: c.name,
                    streamIcon: c.stream_icon,
                    rating: c.rating,
                    containerExtension: c.container_extension,
                    added: c.added ? parseInt(c.added) : 0
                }));
                // Ordenar por adicionado mais recente
                mapped.sort((a, b) => b.added - a.added);
                
                if (typeof onVodListLoaded === 'function') {
                    onVodListLoaded(JSON.stringify(mapped));
                }
            }
        });
    }

    getSeriesCategories() {
        this._apiCall('get_series_categories').then(data => {
            if (data && Array.isArray(data)) {
                const mapped = data.map(c => ({
                    categoryId: c.category_id,
                    categoryName: c.category_name
                }));
                if (typeof onSeriesCategoriesLoaded === 'function') {
                    onSeriesCategoriesLoaded(JSON.stringify(mapped));
                }
            }
        });
    }

    getSeriesList(categoryId) {
        this._apiCall('get_series', { category_id: categoryId }).then(data => {
            if (data && Array.isArray(data)) {
                const mapped = data.map(c => ({
                    seriesId: c.series_id,
                    name: c.name,
                    cover: c.cover,
                    rating: c.rating,
                    last_modified: c.last_modified ? parseInt(c.last_modified) : 0
                }));
                // Ordenar por modificado mais recente (ou adicionado)
                mapped.sort((a, b) => b.last_modified - a.last_modified);
                
                if (typeof onSeriesListLoaded === 'function') {
                    onSeriesListLoaded(JSON.stringify(mapped));
                }
            }
        });
    }

    getEpg(streamId) {
        this._apiCall('get_short_epg', { stream_id: streamId }).then(data => {
            if (data && data.epg_listings && Array.isArray(data.epg_listings) && data.epg_listings.length > 0) {
                const mapped = data.epg_listings.map(e => ({
                    title: e.title,
                    start: e.start,
                    end: e.end,
                    description: e.description
                }));
                if (typeof onEpgLoaded === 'function') {
                    onEpgLoaded(JSON.stringify(mapped));
                }
            } else {
                // Fallback elegante se a API retornar vazia ou sem programação
                if (typeof onEpgLoaded === 'function') {
                    const now = new Date();
                    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 horas
                    const formatDate = (d) => d.toISOString().replace('T', ' ').substring(0, 19);
                    onEpgLoaded(JSON.stringify([{
                        title: "Programação ao Vivo",
                        start: formatDate(now),
                        end: formatDate(end),
                        description: "Programação ao vivo em tempo real."
                    }]));
                }
            }
        }).catch(err => {
            console.error('Error fetching EPG on web access:', err);
            if (typeof onEpgLoaded === 'function') {
                onEpgLoaded(JSON.stringify([]));
            }
        });
    }

    getStreamUrl(streamId) {
        // Assume 'live' by default for compatibility
        const realUrl = `${this.serverUrl}/live/${this.username}/${this.password}/${streamId}.ts`;
        return `${window.location.origin}/proxy-stream?url=${encodeURIComponent(realUrl)}`;
    }
    
    getVodStreamUrl(streamId, extension = 'mp4') {
        const realUrl = `${this.serverUrl}/movie/${this.username}/${this.password}/${streamId}.${extension}`;
        return `${window.location.origin}/proxy-stream?url=${encodeURIComponent(realUrl)}`;
    }
    
    getSeriesStreamUrl(streamId, extension = 'mp4') {
        const realUrl = `${this.serverUrl}/series/${this.username}/${this.password}/${streamId}.${extension}`;
        return `${window.location.origin}/proxy-stream?url=${encodeURIComponent(realUrl)}`;
    }

    getSeriesInfo(seriesId) {
        this._apiCall('get_series_info', { series_id: seriesId }).then(data => {
            if (data && data.episodes) {
                if (typeof onSeriesInfoLoaded === 'function') {
                    onSeriesInfoLoaded(JSON.stringify(data));
                }
            } else {
                this._sendMockSeriesInfo(seriesId);
            }
        }).catch(() => {
            this._sendMockSeriesInfo(seriesId);
        });
    }

    _sendMockSeriesInfo(seriesId) {
        if (typeof onSeriesInfoLoaded === 'function') {
            const mock = {
                episodes: {
                    "1": [
                        { id: "101", episode_num: 1, title: "O Começo de Tudo", container_extension: "mp4", info: { duration: "45m", movie_image: "" } },
                        { id: "102", episode_num: 2, title: "A Primeira Regra", container_extension: "mp4", info: { duration: "43m", movie_image: "" } },
                        { id: "103", episode_num: 3, title: "O Desafio", container_extension: "mp4", info: { duration: "44m", movie_image: "" } }
                    ],
                    "2": [
                        { id: "201", episode_num: 1, title: "Temporada 2 - Piloto", container_extension: "mp4", info: { duration: "45m", movie_image: "" } },
                        { id: "202", episode_num: 2, title: "Consequências", container_extension: "mp4", info: { duration: "42m", movie_image: "" } }
                    ]
                }
            };
            onSeriesInfoLoaded(JSON.stringify(mock));
        }
    }
    
    getBannerItems() {
        console.log("🌐 WebBridge: Buscando banner dos últimos filmes adicionados...");
        this.preloadSearchData().then(() => {
            if (!this.movies || this.movies.length === 0) {
                this._sendMockBanner();
                return;
            }

            // Ordena por id decrescente para pegar os últimos e remove duplicados por nome limpo
            const seen = new Set();
            const sortedUnique = [];
            const sorted = [...this.movies].sort((a, b) => b.id - a.id);
            
            for (const m of sorted) {
                const clean = m.name.toLowerCase().trim()
                    .replace(/\[.*?\]|\(.*?\)|\|.*?\|/g, '')
                    .replace(/\b(4k|fhd|uhd|1080p|720p|leg|dub|dublado|legendado)\b/g, '')
                    .trim();
                if (!seen.has(clean)) {
                    seen.add(clean);
                    sortedUnique.push(m);
                }
                if (sortedUnique.length >= 10) break;
            }

            // Para cada um, busca os detalhes no TMDB
            const promises = sortedUnique.map(m => {
                const cleanTitle = m.name
                    .replace(/\[LEG]|\[DUB]|\(Legendado\)|\(Dublado\)|H.264|H.265|4K|1080P|720P|WEB-DL|BLURAY/gi, '')
                    .replace(/\b(19|20)\d{2}\b/g, '')
                    .trim();
                return fetch(`/api/tmdb/search?query=${encodeURIComponent(cleanTitle)}`)
                    .then(r => r.json())
                    .catch(() => null);
            });

            Promise.all(promises).then(results => {
                const valid = results.filter(r => r !== null && r.backdropUrl);
                if (valid.length > 0) {
                    if (typeof onBannerItemsLoaded === 'function') {
                        onBannerItemsLoaded(JSON.stringify(valid));
                    }
                } else {
                    this._sendMockBanner();
                }
            });
        }).catch(() => {
            this._sendMockBanner();
        });
    }

    _sendMockBanner() {
        const mockBanner = [{
            title: "O Conde de Monte Cristo", 
            overview: "O jovem Edmond Dantès é alvo de uma trama sinistra e acaba sendo preso no dia de seu casamento. Após 14 anos, ele consegue fugir e assume a identidade do Conde de Monte Cristo para se vingar.",
            backdropUrl: "https://image.tmdb.org/t/p/original/9kcTsX2laYclN4bFiMH3RuhZel2.jpg",
            posterPath: "/9kcTsX2laYclN4bFiMH3RuhZel2.jpg",
            logoUrl: "https://placehold.co/800x200/transparent/white?text=O+Conde+de+Monte+Cristo",
            releaseYear: "2024", voteAverage: 8.5, ageRating: "14"
        }];
        if (typeof onBannerItemsLoaded === 'function') {
            onBannerItemsLoaded(JSON.stringify(mockBanner));
        }
    }
    
    loadCategory(cat) {
        const mockMovies = [
            {name: "Avatar: O Caminho da Água", poster: "https://image.tmdb.org/t/p/w500/mbYQWsHZkpcbgXrjcwJ8pKEOWi.jpg"},
            {name: "Homem-Aranha", poster: "https://image.tmdb.org/t/p/w500/8qBylBsQf4llkGrjuCAlsqK9p13.jpg"},
            {name: "Batman", poster: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg"},
            {name: "Duna: Parte 2", poster: "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8Ez05SQ37I.jpg"}
        ];
        // O app original do Android usa renderizarItens diretamente
        if (cat === 'filmes') {
            if (typeof renderizarItens === 'function') renderizarItens(mockMovies, 'movie-row');
        } else if (cat === 'series') {
            if (typeof renderizarItens === 'function') renderizarItens(mockMovies, 'series-row');
        }
    }

    searchContent(query) {
        const clean = query.trim().toLowerCase();
        if (!clean) {
            if (typeof onSearchResultsLoaded === 'function') onSearchResultsLoaded('[]');
            return;
        }

        // Se já temos os dados carregados em memória, faz a busca local instantânea
        if (this.movies && this.series) {
            this._doLocalSearch(clean);
            return;
        }

        // Se os dados estão sendo baixados, aguarda a mesma promessa única
        this.preloadSearchData().then(() => {
            this._doLocalSearch(clean);
        }).catch(err => {
            console.error("Erro no fluxo de pesquisa:", err);
            if (typeof onSearchResultsLoaded === 'function') onSearchResultsLoaded('[]');
        });
    }

    _doLocalSearch(clean) {
        const results = [];
        
        // Filtra filmes até 50
        const filteredMovies = (this.movies || []).filter(m => m.name.toLowerCase().includes(clean)).slice(0, 50);
        results.push(...filteredMovies);

        // Se faltar espaço, preenche com séries
        if (results.length < 50) {
            const filteredSeries = (this.series || []).filter(s => s.name.toLowerCase().includes(clean)).slice(0, 50 - results.length);
            results.push(...filteredSeries);
        }

        if (typeof onSearchResultsLoaded === 'function') {
            onSearchResultsLoaded(JSON.stringify(results));
        }
    }

    // checkForUpdates/downloadAndInstallApk (simulador antigo) foram removidos:
    // o verificador real vive no app.js (verificarAtualizacao), que lê o
    // version.json do repositório. Ninguém chamava estes métodos.

    getRecentMovies() {
        if (this.movies) {
            const sorted = [...this.movies].sort((a, b) => b.id - a.id).slice(0, 15);
            const mapped = sorted.map(m => ({
                streamId: m.id,
                name: m.name,
                streamIcon: m.streamIcon,
                rating: m.rating
            }));
            if (typeof onRecentMoviesLoaded === 'function') {
                onRecentMoviesLoaded(JSON.stringify(mapped));
            }
        } else {
            this.preloadSearchData().then(() => {
                if (this.movies) {
                    const sorted = [...this.movies].sort((a, b) => b.id - a.id).slice(0, 15);
                    const mapped = sorted.map(m => ({
                        streamId: m.id,
                        name: m.name,
                        streamIcon: m.streamIcon,
                        rating: m.rating
                    }));
                    if (typeof onRecentMoviesLoaded === 'function') {
                        onRecentMoviesLoaded(JSON.stringify(mapped));
                    }
                }
            });
        }
    }

    getRecentSeries() {
        if (this.series) {
            const sorted = [...this.series].sort((a, b) => b.id - a.id).slice(0, 15);
            const mapped = sorted.map(s => ({
                seriesId: s.id,
                name: s.name,
                cover: s.streamIcon,
                rating: s.rating
            }));
            if (typeof onRecentSeriesLoaded === 'function') {
                onRecentSeriesLoaded(JSON.stringify(mapped));
            }
        } else {
            this.preloadSearchData().then(() => {
                if (this.series) {
                    const sorted = [...this.series].sort((a, b) => b.id - a.id).slice(0, 15);
                    const mapped = sorted.map(s => ({
                        seriesId: s.id,
                        name: s.name,
                        cover: s.streamIcon,
                        rating: s.rating
                    }));
                    if (typeof onRecentSeriesLoaded === 'function') {
                        onRecentSeriesLoaded(JSON.stringify(mapped));
                    }
                }
            });
        }
    }

    getAppVersion() {
        return this.simulatedVersion;
    }

    /**
     * Nunca é TV: aqui estamos no navegador, onde existe teclado de verdade.
     * Precisa existir porque o app.js usa a ausência do método para deduzir
     * "APK antigo" e, nesse caso, manter o teclado virtual ligado.
     */
    isTv() {
        return false;
    }

    // ---- Configurações ----

    getFormatoLive() {
        return localStorage.getItem('formato_live') || 'ts';
    }

    setFormatoLive(formato) {
        localStorage.setItem('formato_live', formato === 'm3u8' ? 'm3u8' : 'ts');
    }

    /** Mesma chamada do login (player_api.php sem action) devolve user_info. */
    getUserInfo() {
        const responder = (obj) => {
            if (typeof onUserInfoLoaded === 'function') {
                onUserInfoLoaded(JSON.stringify(obj));
            }
        };

        this._apiCall('').then(dados => {
            const info = dados && dados.user_info;
            if (!info) return responder({ ok: false, erro: 'Servidor nao retornou os dados da conta.' });

            const fuso = (dados.server_info && dados.server_info.timezone) || 'America/Sao_Paulo';
            let expiracao = 'Sem vencimento';
            const seg = parseInt(info.exp_date, 10);
            if (!isNaN(seg)) {
                expiracao = new Date(seg * 1000)
                    .toLocaleString('pt-BR', { timeZone: fuso, dateStyle: 'short', timeStyle: 'short' }) +
                    ' (' + fuso + ')';
            }

            responder({
                ok: true,
                username: info.username || '',
                status: info.status || '',
                maxConnections: info.max_connections || '',
                timezone: fuso,
                allowedFormats: (info.allowed_output_formats || []).map(f => String(f).toUpperCase()).join(', '),
                expDate: expiracao
            });
        }).catch(e => responder({ ok: false, erro: 'Falha ao consultar a assinatura.' }));
    }

    // ---- Favoritos ----
    // Espelha o FavoritosManager do Android (que grava em SharedPreferences)
    // usando localStorage. Mesma assinatura e mesmo formato de retorno, para o
    // app.js não precisar saber em qual dos dois está rodando.

    _favoritos() {
        try {
            const bruto = JSON.parse(localStorage.getItem('wb_favoritos') || '[]');
            return Array.isArray(bruto) ? bruto : [];
        } catch (e) {
            return [];
        }
    }

    _salvarFavoritos(lista) {
        try { localStorage.setItem('wb_favoritos', JSON.stringify(lista)); } catch (e) {}
    }

    /** Alterna e devolve true se o item ficou favorito, false se saiu. */
    addFavorite(json) {
        let item;
        try { item = JSON.parse(json); } catch (e) { return false; }
        if (!item || !item.id) return false;

        const tipo = ['series', 'live'].includes(item.tipo) ? item.tipo : 'movie';
        const lista = this._favoritos();
        const i = lista.findIndex(f => f.id === item.id && f.tipo === tipo);

        if (i >= 0) {
            lista.splice(i, 1);
            this._salvarFavoritos(lista);
            return false;
        }

        lista.push({
            id: item.id,
            titulo: item.titulo || '',
            posterPath: item.posterPath || '',
            tipo: tipo
        });
        this._salvarFavoritos(lista);
        return true;
    }

    isFavorite(id, tipo) {
        return this._favoritos().some(f => f.id === id && f.tipo === tipo);
    }

    /** Mesmo formato de getLiveChannels, para reusar o onLiveChannelsLoaded. */
    getFavoriteChannels() {
        const canais = this._favoritos()
            .filter(f => f.tipo === 'live')
            .sort((a, b) => String(a.titulo).localeCompare(String(b.titulo), 'pt-BR'))
            .map(f => ({ streamId: f.id, name: f.titulo, icon: f.posterPath || '' }));

        if (typeof onLiveChannelsLoaded === 'function') {
            onLiveChannelsLoaded(JSON.stringify(canais));
        }
    }
}

// Injetar o WebBridge automaticamente se não estivermos no Android Nativo
if (typeof window.AndroidApp === 'undefined') {
    console.log("🌐 WebBridge: Android Nativo não detectado. Ativando modo WebPlayer Proxy.");
    window.AndroidApp = new WebBridge();
}
