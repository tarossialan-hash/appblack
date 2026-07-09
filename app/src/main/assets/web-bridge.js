class WebBridge {
    constructor() {
        this.serverUrl = localStorage.getItem('wb_url') || '';
        this.username = localStorage.getItem('wb_user') || '';
        this.password = localStorage.getItem('wb_pass') || '';
        this.movies = null;
        this.series = null;
        this.searchDataPromise = null;
        this.simulatedVersion = localStorage.getItem('wb_simulated_version') || "1.0.0 (Web)";

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
    
    getBannerItems() {
        console.log("🌐 WebBridge: Buscando filmes reais do TMDB via proxy...");
        fetch('/api/tmdb/now-playing')
            .then(r => r.json())
            .then(data => {
                if (data && Array.isArray(data) && data.length > 0) {
                    console.log("🌐 WebBridge: Filmes reais do TMDB obtidos com sucesso.");
                    if (typeof onBannerItemsLoaded === 'function') {
                        onBannerItemsLoaded(JSON.stringify(data));
                    }
                } else {
                    console.warn("🌐 WebBridge: API TMDB retornou vazia, usando fallback.");
                    this._sendMockBanner();
                }
            })
            .catch(err => {
                console.error("🌐 WebBridge: Erro ao buscar TMDB, usando fallback:", err);
                this._sendMockBanner();
            });
    }

    _sendMockBanner() {
        const mockBanner = [{
            title: "O Conde de Monte Cristo", 
            overview: "O jovem Edmond Dantès é alvo de uma trama sinistra e acaba sendo preso no dia de seu casamento. Após 14 anos, ele consegue fugir e assume a identidade do Conde de Monte Cristo para se vingar.",
            backdropUrl: "https://image.tmdb.org/t/p/original/9kcTsX2laYclN4bFiMH3RuhZel2.jpg",
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

    checkForUpdates() {
        console.log("🌐 WebBridge: Simulando checagem de atualizações...");
        // Mostra update se versão for menor que 1.0.2
        const needsUpdate = this.simulatedVersion.includes("1.0.0") || this.simulatedVersion.includes("1.0.1");
        if (needsUpdate) {
            setTimeout(() => {
                if (typeof showUpdateModal === 'function') {
                    showUpdateModal('1.0.2', 'https://raw.githubusercontent.com/tarossialan-hash/appblack/main/app-release.apk');
                }
            }, 1500);
        }
    }

    downloadAndInstallApk(apkUrl) {
        console.log("🌐 WebBridge: Simulando download do APK:", apkUrl);
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            if (typeof updateDownloadProgress === 'function') {
                updateDownloadProgress(progress);
            }
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    // Salva a versão simulada no localStorage para persistir nos reloads!
                    localStorage.setItem('wb_simulated_version', '1.0.2 (Web)');
                    
                    // Fecha o modal de atualização
                    if (typeof fecharUpdateModal === 'function') {
                        fecharUpdateModal();
                    }
                    
                    // Esconde as pílulas/badges
                    const navBtn = document.getElementById('nav-update-btn');
                    if (navBtn) navBtn.style.display = 'none';
                    const loginBtn = document.getElementById('login-update-btn');
                    if (loginBtn) loginBtn.style.display = 'none';
                    
                    // Simula reinício automático do app recarregando a página
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                }, 500);
            }
        }, 300);
    }

    getAppVersion() {
        return this.simulatedVersion;
    }
}

// Injetar o WebBridge automaticamente se não estivermos no Android Nativo
if (typeof window.AndroidApp === 'undefined') {
    console.log("🌐 WebBridge: Android Nativo não detectado. Ativando modo WebPlayer Proxy.");
    window.AndroidApp = new WebBridge();
}
