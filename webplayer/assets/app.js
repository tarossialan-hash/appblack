// Funções de Login
function fazerLogin() {
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const status = document.getElementById("login-status");

    if (!user || !pass) {
        status.innerText = "Preencha usuário e senha";
        return;
    }

    localStorage.setItem("wb_user", user);
    localStorage.setItem("wb_pass", pass);

    if (window.AndroidApp) {
        // Mostra a tela de sync imediatamente
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("sync-screen").style.display = "flex";
        document.getElementById("sync-status-text").innerText = "Conectando ao servidor...";
        document.getElementById("sync-progress").style.width = "0%";
        
        window.AndroidApp.login(user, pass);
    } else {
        document.getElementById("login-screen").style.display = "none";
        status.innerText = "Conectando...";
        setTimeout(() => {
            onLoginSuccess(user);
        }, 1000);
    }
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById("password");
    const btn = document.querySelector(".toggle-password-btn");
    if (!passwordInput || !btn) return;
    
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        btn.innerHTML = `<svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
    } else {
        passwordInput.type = "password";
        btn.innerHTML = `<svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    }
}

// Função chamada pelo Kotlin (Servidor) para atualizar o progresso em tempo real
function updateSyncProgress(percent, statusText) {
    const syncScreen = document.getElementById("sync-screen");
    if (syncScreen.style.display === "none") {
        document.getElementById("login-screen").style.display = "none";
        syncScreen.style.display = "flex";
    }
    document.getElementById("sync-status-text").innerText = statusText;
    document.getElementById("sync-progress").style.width = percent + '%';
}

function onLoginSuccess(username) {
    localStorage.setItem('logged_in_user', username);
    if (window.AndroidApp) {
        document.getElementById("sync-screen").style.display = "none";
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("home-screen").style.display = "block";
        const savedCat = localStorage.getItem('current_category') || 'inicio';
        const savedBtn = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick') && el.getAttribute('onclick').includes(`'${savedCat}'`)) || document.querySelector('.nav-item');
        mostrarCategoria(savedBtn, savedCat);
    } else {
        const syncScreen = document.getElementById("sync-screen");
        syncScreen.style.display = "flex";
        
        const statusText = document.getElementById("sync-status-text");
        const progressBar = document.getElementById("sync-progress");
        
        const steps = [
            { text: "Sincronizando canais...", progress: 25, time: 800 },
            { text: "Sincronizando EPG...", progress: 50, time: 1000 },
            { text: "Sincronizando Filmes e Séries...", progress: 75, time: 1200 },
            { text: "Carregando HOME...", progress: 100, time: 800 }
        ];
        
        let currentStep = 0;
        
        function nextStep() {
            if (currentStep < steps.length) {
                statusText.innerText = steps[currentStep].text;
                progressBar.style.width = steps[currentStep].progress + '%';
                setTimeout(() => {
                    currentStep++;
                    nextStep();
                }, steps[currentStep].time);
            } else {
                syncScreen.style.display = "none";
                document.getElementById("home-screen").style.display = "block";
                
                if (!document.getElementById("login-screen") || document.getElementById("login-screen").style.display === "none") {
                    const savedCat = localStorage.getItem('current_category') || 'inicio';
                    const savedBtn = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick') && el.getAttribute('onclick').includes(`'${savedCat}'`)) || document.querySelector('.nav-item');
                    mostrarCategoria(savedBtn, savedCat);
                }
            }
        }
        
        nextStep();
    }
}

function onLoginError(message) {
    document.getElementById("sync-screen").style.display = "none";
    document.getElementById("login-screen").style.display = "flex";
    
    let friendlyMessage = message;
    if (!message || message.includes("404") || message.includes("401") || message.includes("not found") || message.includes("unauthorized") || message.includes("HTTP")) {
        friendlyMessage = "Usuário ou senha incorretos. Verifique os dados.";
    } else if (message.includes("timeout") || message.includes("connect") || message.includes("Unable to resolve host")) {
        friendlyMessage = "Falha de conexão com o servidor. Tente novamente.";
    }
    
    document.getElementById("login-status").innerText = friendlyMessage;
}

function sair() {
    localStorage.removeItem('logged_in_user');
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("login-status").innerText = "";
    setTimeout(() => {
        const usernameInput = document.getElementById('username');
        if (usernameInput) usernameInput.focus();
    }, 100);
}

function recarregar() {
    let user = localStorage.getItem("wb_user");
    let pass = localStorage.getItem("wb_pass");
    
    // Mostra tela de sincronização e esconde a home
    document.getElementById("sync-screen").style.display = "flex";
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("sync-status-text").innerText = "Sincronizando banco de dados...";
    document.getElementById("sync-progress").style.width = "0%";
    
    if (window.AndroidApp && user && pass) {
        window.AndroidApp.login(user, pass);
    } else {
        // Modo Web: simula a sincronização para não dar reload infinito e carregar atualizado
        let currentStep = 0;
        const steps = [
            { text: "Sincronizando canais...", progress: 25, time: 800 },
            { text: "Sincronizando EPG...", progress: 50, time: 1000 },
            { text: "Sincronizando Filmes e Séries...", progress: 75, time: 1200 },
            { text: "Carregando HOME...", progress: 100, time: 800 }
        ];
        
        function nextStep() {
            if (currentStep < steps.length) {
                document.getElementById("sync-status-text").innerText = steps[currentStep].text;
                document.getElementById("sync-progress").style.width = steps[currentStep].progress + '%';
                setTimeout(() => {
                    currentStep++;
                    nextStep();
                }, steps[currentStep].time);
            } else {
                document.getElementById("sync-screen").style.display = "none";
                document.getElementById("home-screen").style.display = "block";
                
                const savedCat = localStorage.getItem('current_category') || 'inicio';
                const savedBtn = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick') && el.getAttribute('onclick').includes(`'${savedCat}'`)) || document.querySelector('.nav-item');
                mostrarCategoria(savedBtn, savedCat);
            }
        }
        nextStep();
    }
}

function buscar() {
    // Esconde todas as outras telas do app
    document.querySelector('.home-scroll-area').style.display = 'none';
    document.getElementById('live-tv-screen').style.display = 'none';
    document.getElementById('vod-tv-screen').style.display = 'none';
    
    // Desmarca os botões da barra superior
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    // Mostra a tela de busca
    const searchScreen = document.getElementById('search-tv-screen');
    if (searchScreen) {
        searchScreen.style.display = 'flex';
    }
    
    // Esconde a barra de navegação superior para não sobrepor (vira uma página dedicada)
    const topNav = document.querySelector('.top-nav');
    if (topNav) topNav.style.display = 'none';

    // Foca na primeira tecla do teclado virtual
    setTimeout(() => {
        const firstKey = document.querySelector('.sk-key');
        if (firstKey) firstKey.focus();
    }, 100);
}

function fecharBusca() {
    const inicioBtn = document.querySelector('.nav-item');
    mostrarCategoria(inicioBtn, 'inicio');
}

function mostrarCategoria(btn, cat) {
    localStorage.setItem('current_category', cat);
    
    // Para a reprodução do mini-player de TV ao Vivo ao sair da tela de canais
    if (cat !== 'tv') {
        if (mpegtsPlayer) {
            try { mpegtsPlayer.destroy(); } catch(e) {}
            mpegtsPlayer = null;
        }
        const videoElement = document.getElementById('live-player');
        if (videoElement) {
            try {
                videoElement.pause();
                videoElement.removeAttribute('src');
                videoElement.load();
            } catch(e) {}
        }
    }
    
    // Oculta a tela de busca se estiver ativa
    const searchScreen = document.getElementById('search-tv-screen');
    if (searchScreen) searchScreen.style.display = 'none';

    // Atualiza o visual dos botões
    if (btn) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
    }
    
    // Ocultar menu superior nas categorias que não são 'inicio'
    const topNav = document.querySelector('.top-nav');
    if (topNav) {
        topNav.style.display = (cat === 'inicio') ? 'flex' : 'none';
    }

    if (cat === 'inicio') {
        document.querySelector('.home-scroll-area').style.display = 'block';
        document.getElementById('live-tv-screen').style.display = 'none';
        
        const bannerContainer = document.getElementById('dynamic-hero-banner');
        if (bannerContainer) bannerContainer.style.display = 'block';
        
        if (window.AndroidApp) {
            // Android: só busca se o banner ainda não foi carregado
            if (!window._bannerLoaded) {
                window.AndroidApp.getBannerItems();
                if (typeof window.AndroidApp.getRecentMovies === 'function') {
                    window.AndroidApp.getRecentMovies();
                }
                if (typeof window.AndroidApp.getRecentSeries === 'function') {
                    window.AndroidApp.getRecentSeries();
                }
                window._bannerLoaded = true;
            }
        } else {
            // Web: só busca TMDB se o carrossel ainda não foi inicializado
            if (!window._tmdbBannerLoaded) {
                window._tmdbBannerLoaded = true;
                fetch('/api/tmdb/now-playing')
                    .then(r => r.json())
                    .then(data => {
                        if (data && data.length > 0) {
                            onBannerItemsLoaded(JSON.stringify(data));
                        } else {
                            onBannerItemsLoaded(JSON.stringify([
                                { title: "Carregando...", overview: "Buscando filmes em cartaz...", backdropUrl: "", releaseYear: "", voteAverage: "", ageRating: "" }
                            ]));
                        }
                    })
                    .catch(() => {
                        onBannerItemsLoaded(JSON.stringify([
                            { title: "Sem conexão", overview: "Não foi possível carregar os destaques.", backdropUrl: "", releaseYear: "", voteAverage: "", ageRating: "" }
                        ]));
                    });
            }
        }
    } else if (cat === 'tv') {
        document.querySelector('.home-scroll-area').style.display = 'none';
        document.getElementById('live-tv-screen').style.display = 'flex';
        document.getElementById('vod-tv-screen').style.display = 'none';
        
        const bannerContainer = document.getElementById('dynamic-hero-banner');
        if (bannerContainer) bannerContainer.style.display = 'none';

        
        document.getElementById('live-player-overlay').style.display = 'flex';
        document.getElementById('live-player-loader').style.display = 'none';
        document.getElementById('live-player-title').innerText = "Selecione um canal";
        
        if (window.AndroidApp) {
            window.AndroidApp.getLiveCategories();
        } else {
            onLiveCategoriesLoaded(JSON.stringify([
                {categoryId: "1", categoryName: "Abertos"},
                {categoryId: "2", categoryName: "Notícias"}
            ]));
        }
    } else if (cat === 'filmes' || cat === 'series') {
        document.querySelector('.home-scroll-area').style.display = 'none';
        document.getElementById('live-tv-screen').style.display = 'none';
        document.getElementById('vod-tv-screen').style.display = 'flex';
        
        const bannerContainer = document.getElementById('dynamic-hero-banner');
        if (bannerContainer) bannerContainer.style.display = 'none';

        
        document.getElementById('vod-categories-list').innerHTML = "";
        document.getElementById('vod-items-grid').innerHTML = "";
        
        if (cat === 'filmes') {
            if (window.AndroidApp) {
                window.AndroidApp.getVodCategories();
            } else {
                onVodCategoriesLoaded(JSON.stringify([{categoryId: "10", categoryName: "Ação"}]));
            }
        } else {
            if (window.AndroidApp) {
                window.AndroidApp.getSeriesCategories();
            } else {
                onSeriesCategoriesLoaded(JSON.stringify([{categoryId: "20", categoryName: "Comédia"}]));
            }
        }
    }
}

function onBannerItemsLoaded(jsonString) {
    let items = [];
    try { items = JSON.parse(jsonString); } catch(e) {}
    if (!items || items.length === 0) return;

    // Remove duplicados por título limpo
    const seenTitles = new Set();
    items = items.filter(item => {
        const titleText = item.title || item.name;
        if (!titleText) return false;
        const clean = titleText.toLowerCase().trim()
            .replace(/\[.*?\]|\(.*?\)|\|.*?\|/g, '')
            .replace(/\b(4k|fhd|uhd|1080p|720p|leg|dub|dublado|legendado)\b/g, '')
            .trim();
        if (seenTitles.has(clean)) {
            return false;
        }
        seenTitles.add(clean);
        return true;
    });

    if (items.length === 0) return;

    const container = document.getElementById('dynamic-hero-banner');
    if (!container) return;

    const AUTOPLAY_MS = 8000;
    let current = 0;
    let progressTimer = null;
    let progressStart = null;
    let progressPaused = false;

    function posterUrl(item) {
        if (item.posterPath) return `https://image.tmdb.org/t/p/w342${item.posterPath}`;
        return '';
    }

    // Pré-valida imagens: descarta slides onde backdrop OU logo não carregam
    function preloadImage(url) {
        return new Promise(resolve => {
            if (!url) { resolve(false); return; }
            const img = new Image();
            img.onload  = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    async function initWithValidation() {
        const validItems = [];
        for (const item of items) {
            const [backdropOk, logoOk] = await Promise.all([
                preloadImage(item.backdropUrl),
                preloadImage(item.logoUrl)
            ]);
            if (backdropOk && logoOk) {
                validItems.push(item);
            }
            if (validItems.length >= 6) break;
        }
        if (validItems.length === 0) return;
        items = validItems;
        render(0);
    }

    function render(index) {
        const item = items[index];
        const backdrop = item.backdropUrl || '';
        const poster   = posterUrl(item);

        const ratingChip = item.voteAverage
            ? `<span class="spotlight-chip rating">&#9733; ${parseFloat(item.voteAverage).toFixed(1)}</span>` : '';
        const yearChip = item.releaseYear
            ? `<span class="spotlight-chip">${item.releaseYear}</span>` : '';

        const thumbsHtml = items.map((m, i) =>
            `<img class="spotlight-thumb${i === index ? ' active' : ''}"
                  src="${m.backdropUrl || ''}"
                  data-idx="${i}"
                  alt="${m.title || ''}"
                  onerror="this.style.opacity='0'">`
        ).join('');

        const posterHtml = poster
            ? `<img class="spotlight-poster" src="${poster}" alt="${item.title || ''}" onerror="this.style.display='none'">`
            : `<div class="spotlight-poster-placeholder"></div>`;

        const titleHtml = item.logoUrl
            ? `<img class="spotlight-logo" src="${item.logoUrl}" alt="${item.title || ''}" onerror="this.outerHTML='<div class=&quot;spotlight-title&quot;>${item.title || ''}</div>'">`
            : `<div class="spotlight-title">${item.title || item.name || ''}</div>`;

        container.innerHTML = `
            <div class="spotlight-backdrop" style="background-image:url('${backdrop}')"></div>
            <div class="spotlight-gradient"></div>

            <button class="spotlight-arrow prev" id="sp-prev">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button class="spotlight-arrow next" id="sp-next">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>

            <div class="spotlight-content">
                <div class="spotlight-info">
                    <div class="spotlight-badge">&#9654; Novidade</div>
                    ${titleHtml}
                    <div class="spotlight-meta">${ratingChip}${yearChip}</div>
                    <div class="spotlight-overview">${item.overview || ''}</div>
                    <div class="spotlight-progress-bar">
                        <div class="spotlight-progress-fill" id="sp-progress"></div>
                    </div>
                </div>
            </div>
        `;

        // Eventos das setas
        document.getElementById('sp-prev').onclick = (e) => { e.stopPropagation(); go(current - 1); };
        document.getElementById('sp-next').onclick = (e) => { e.stopPropagation(); go(current + 1); };

        // Eventos dos thumbnails
        container.querySelectorAll('.spotlight-thumb').forEach(thumb => {
            thumb.onclick = () => go(parseInt(thumb.dataset.idx));
        });

        // Pausa no hover
        container.onmouseenter = () => { progressPaused = true; };
        container.onmouseleave = () => {
            progressPaused = false;
            startProgress();
        };

        startProgress();
    }

    function startProgress() {
        clearTimeout(progressTimer);
        progressTimer = setTimeout(() => {
            if (!progressPaused) {
                go(current + 1);
            } else {
                startProgress();
            }
        }, AUTOPLAY_MS);
    }

    function go(index) {
        current = ((index % items.length) + items.length) % items.length;
        clearTimeout(progressTimer);
        render(current);
    }

    initWithValidation();

    const latestSection = document.getElementById('home-latest-section');
    if (latestSection) latestSection.style.display = 'none';
}

function onRecentMoviesLoaded(jsonString) {
    let movies = [];
    try { movies = JSON.parse(jsonString); } catch(e) {}
    
    const container = document.getElementById('movie-row');
    const section = document.getElementById('home-movies-section');
    if (!container || !section) return;
    
    container.innerHTML = '';
    if (movies.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';
    
    // Mostra no máximo 15 itens para ficar harmonizado na tela de TV
    movies.slice(0, 15).forEach(m => {
        const div = document.createElement('div');
        div.className = 'vod-item';
        div.tabIndex = 0;
        
        let iconHtml = m.streamIcon ? `<img src="${m.streamIcon}" class="vod-item-poster" onerror="this.style.display='none'">` : '';
        const movieName = m.name || '';
        let cleanTitle = movieName.replace(/\[.*?\]|\(.*?\)|\|.*?\|/g, ' ').replace(/\b(4K|FHD|UHD|1080p|720p|LEG|DUB|DUBLADO|LEGENDADO|CAM|TS|HDTS|TELESYNC)\b/gi, ' ').trim();
        
        div.innerHTML = `${iconHtml}<div class="vod-item-title">${cleanTitle}</div>`;
        
        div.onclick = () => {
            openVodModal(m, false);
        };
        
        div.onkeydown = (e) => {
            if (e.key === "Enter") div.click();
        };
        
        container.appendChild(div);
    });
}

function onRecentSeriesLoaded(jsonString) {
    let series = [];
    try { series = JSON.parse(jsonString); } catch(e) {}
    
    const container = document.getElementById('series-row');
    const section = document.getElementById('home-series-section');
    if (!container || !section) return;
    
    container.innerHTML = '';
    if (series.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';
    
    series.slice(0, 15).forEach(s => {
        const div = document.createElement('div');
        div.className = 'vod-item';
        div.tabIndex = 0;
        
        let iconHtml = s.cover ? `<img src="${s.cover}" class="vod-item-poster" onerror="this.style.display='none'">` : '';
        const seriesName = s.name || '';
        let cleanTitle = seriesName.replace(/\[.*?\]|\(.*?\)|\|.*?\|/g, ' ').replace(/\b(4K|FHD|UHD|1080p|720p|LEG|DUB|DUBLADO|LEGENDADO|CAM|TS|HDTS|TELESYNC)\b/gi, ' ').trim();
        
        div.innerHTML = `${iconHtml}<div class="vod-item-title">${cleanTitle}</div>`;
        
        div.onclick = () => {
            openVodModal(s, true);
        };
        
        div.onkeydown = (e) => {
            if (e.key === "Enter") div.click();
        };
        
        container.appendChild(div);
    });
}

// ==============================================================================
// CALLBACKS DA TV AO VIVO
// ==========================================
function onLiveCategoriesLoaded(jsonString) {
    let categories = [];
    try { categories = JSON.parse(jsonString); } catch(e) {}
    
    const container = document.querySelector('.live-col-categories');
    container.innerHTML = "";
    
    
    categories.forEach((cat, index) => {
        const div = document.createElement('div');
        div.className = "live-category-item";
        div.tabIndex = 0;
        div.innerText = cat.categoryName;
        
        div.onclick = () => {
            document.querySelectorAll('.live-category-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            if (window.AndroidApp) {
                window.AndroidApp.getLiveChannels(cat.categoryId);
            } else {
                onLiveChannelsLoaded(JSON.stringify([{streamId: 101, name: "Canal Mock " + cat.categoryName, icon: ""}]));
            }
        };
        
        div.onkeydown = (e) => {
            if (e.key === "Enter") div.click();
        };
        
        container.appendChild(div);
    });
    
    // Auto-seleciona a primeira categoria
    if (categories.length > 0) {
        setTimeout(() => {
            const firstCat = container.querySelector('.live-category-item');
            if (firstCat) {
                firstCat.focus();
                firstCat.click();
            }
        }, 100);
    }
}

function onLiveChannelsLoaded(jsonString) {
    let channels = [];
    try { channels = JSON.parse(jsonString); } catch(e) {}
    
    const container = document.querySelector('.live-col-channels');
    container.innerHTML = "";
    
    channels.forEach((ch, index) => {
        const div = document.createElement('div');
        div.className = "live-channel-item";
        div.tabIndex = 0;
        div._channelData = ch;
        
        let iconUrl = ch.streamIcon || ch.icon;
        let iconHtml = iconUrl ? `<img src="${iconUrl}" class="channel-logo" onerror="this.style.display='none'">` : '';
        div.innerHTML = `${iconHtml}<span>${ch.name}</span>`;
        
        div.onclick = () => {
            if (div.classList.contains('active')) {
                // Segundo clique: abre em tela cheia o mini-player SEM recarregar o vídeo
                const previewContainer = document.querySelector('.live-player-container');
                if (previewContainer) {
                    if (previewContainer.requestFullscreen) {
                        previewContainer.requestFullscreen();
                    } else if (previewContainer.webkitRequestFullscreen) {
                        previewContainer.webkitRequestFullscreen();
                    }
                }
                return;
            }
            
            // Primeiro clique: abre no mini-player
            document.querySelectorAll('.live-channel-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            
            document.getElementById('live-player-title').innerText = "Assistindo: " + ch.name;
            
            if (window.AndroidApp) {
                window.AndroidApp.getEpg(ch.streamId);
                let streamUrl = window.AndroidApp.getStreamUrl(ch.streamId);
                if (streamUrl) playLiveStream(streamUrl);
            } else {
                onEpgLoaded(JSON.stringify([{title: "Programa Mock", start: "10:00", end: "11:00", description: "Descrição..."}]));
                const videoElement = document.getElementById('live-player');
                document.getElementById('live-player-overlay').style.display = 'none';
                videoElement.src = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
                videoElement.play();
            }
        };
        
        div.onkeydown = (e) => {
            if (e.key === "Enter") div.click();
        };
        
        container.appendChild(div);
    });
}
// ==========================================
// VOD & Series Loaders
// ==========================================

const TMDB_API_KEY = "e8a5a7a31529ab1a19de1ffb7a09b0b5";

async function fetchTmdbData(title, isSeries) {
    try {
        const type = isSeries ? 'tv' : 'movie';
        let cleanTitle = title.replace(/\[.*?\]|\(.*?\)|\|.*?\|/g, ' ');
        cleanTitle = cleanTitle.replace(/\b(4K|FHD|UHD|1080p|720p|LEG|DUB|DUBLADO|LEGENDADO|CAM|TS|HDTS|TELESYNC)\b/gi, ' ').trim();

        const searchUrl = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}&language=pt-BR`;
        const res  = await fetch(searchUrl);
        const data = await res.json();
        const result = data.results && data.results.length > 0 ? data.results[0] : null;
        if (!result) return null;

        // Busca detalhes + créditos + imagens em paralelo
        const [detailsRes, creditsRes, imgRes] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/${type}/${result.id}?api_key=${TMDB_API_KEY}&language=pt-BR`),
            fetch(`https://api.themoviedb.org/3/${type}/${result.id}/credits?api_key=${TMDB_API_KEY}&language=pt-BR`),
            fetch(`https://api.themoviedb.org/3/${type}/${result.id}/images?api_key=${TMDB_API_KEY}&include_image_language=pt,en,null`)
        ]);
        const details = await detailsRes.json();
        const credits = await creditsRes.json();
        const imgData = await imgRes.json();

        // Logo
        const logos = imgData.logos || [];
        const logo  = logos.find(l => l.iso_639_1 === 'pt') || logos.find(l => l.iso_639_1 === 'en') || logos[0];

        // Gêneros
        const genres = (details.genres || []).map(g => g.name);

        // Duração
        const runtime = details.runtime || (details.episode_run_time && details.episode_run_time[0]) || null;

        // Data de lançamento formatada
        const rawDate = details.release_date || details.first_air_date || '';
        let releaseDate = '';
        if (rawDate) {
            const d = new Date(rawDate + 'T00:00:00');
            releaseDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }

        // Diretor e elenco
        const crew = credits.crew || [];
        const cast = credits.cast || [];
        const directors = crew.filter(c => c.job === 'Director').map(c => c.name);
        const castNames  = cast.slice(0, 8).map(c => c.name);

        return {
            tmdbId:       result.id,
            title:        result.title || result.name,
            originalTitle: details.original_title || details.original_name || null,
            overview:     result.overview,
            backdropUrl:  result.backdrop_path  ? `https://image.tmdb.org/t/p/original${result.backdrop_path}` : null,
            posterUrl:    result.poster_path    ? `https://image.tmdb.org/t/p/w500${result.poster_path}`       : null,
            logoUrl:      logo && logo.file_path ? `https://image.tmdb.org/t/p/w500${logo.file_path}`          : null,
            year:         rawDate ? rawDate.substring(0, 4) : null,
            releaseDate,
            genres,
            runtime,
            director:     directors,
            cast:         castNames,
            seasonsCount:  details.number_of_seasons || null,
            episodesCount: details.number_of_episodes || null,
            voteAverage:   details.vote_average ? details.vote_average.toFixed(1) : null
        };
    } catch (e) {
        console.error('TMDB Fetch Error', e);
        return null;
    }
}

function playFullscreenVideo(streamUrl, title) {
    const fsContainer = document.getElementById('fs-player-container');
    const fsPlayer    = document.getElementById('fullscreen-player');
    const fsLogo      = document.getElementById('fs-logo');
    const fsTitle     = document.getElementById('fs-title');

    if (fsContainer && fsPlayer) {
        window.isFullscreenLive = false;
        if (typeof updateFullscreenControlsVisibility === 'function') updateFullscreenControlsVisibility();
        fsContainer.style.display = 'block';
        fsPlayer.src = streamUrl;
        fsPlayer.play();
        fsPlayer.focus();
        if (window.currentTmdb && window.currentTmdb.logoUrl) {
            fsLogo.src = window.currentTmdb.logoUrl;
            fsLogo.style.display = 'block';
            fsTitle.style.display = 'none';
        } else {
            fsLogo.style.display = 'none';
            fsTitle.innerText = title;
            fsTitle.style.display = 'none';
        }
        setTimeout(() => { const fb = document.getElementById('fs-btn-play'); if (fb) fb.focus(); }, 200);
        if (fsContainer.requestFullscreen)            fsContainer.requestFullscreen();
        else if (fsContainer.webkitRequestFullscreen) fsContainer.webkitRequestFullscreen();
    }
}

window.onSeriesInfoLoaded = function(jsonString) {
    let data = {};
    try { data = JSON.parse(jsonString); } catch(e) {}

    const tabsContainer = document.getElementById('vod-detail-seasons-tabs');
    const episodesContainer = document.getElementById('vod-detail-episodes-row');
    const seasonTitleEl = document.getElementById('vod-detail-season-title');
    const seriesSection = document.getElementById('vod-detail-series-section');

    if (!tabsContainer || !episodesContainer) return;
    tabsContainer.innerHTML = '';
    episodesContainer.innerHTML = '';

    const episodesMap = data.episodes || {};
    const seasonsKeys = Object.keys(episodesMap).sort((a,b) => parseInt(a) - parseInt(b));

    if (seasonsKeys.length === 0) {
        if (seriesSection) seriesSection.style.display = 'none';
        return;
    }

    if (seriesSection) seriesSection.style.display = 'block';

    function renderSeasonEpisodes(seasonKey) {
        episodesContainer.innerHTML = '';
        if (seasonTitleEl) seasonTitleEl.textContent = `Temporada ${seasonKey}`;

        const episodesList = episodesMap[seasonKey] || [];
        episodesList.forEach(ep => {
            const card = document.createElement('div');
            card.className = 'episode-card';
            card.tabIndex = 0;

            const thumbUrl = (ep.info && ep.info.movieImage) ? ep.info.movieImage : (window._vodDetailItem ? (window._vodDetailItem.cover || window._vodDetailItem.streamIcon) : '');
            let imgHtml = thumbUrl ? `<img src="${thumbUrl}" class="episode-card-thumb" onerror="this.src='logo_black.png'">` : `<div style="width:100%;height:100%;background:#111;display:flex;align-items:center;justify-content:center;color:#fff;">BLACK</div>`;

            const badgeHtml = `<div class="episode-card-badge">E${ep.episodeNumber || ep.episode_num || ep.id}</div>`;
            const titleHtml = `<div class="episode-card-info">${ep.title || `Episódio ${ep.episodeNumber}`}</div>`;

            card.innerHTML = `${imgHtml}${badgeHtml}${titleHtml}`;

            card.onclick = () => {
                let streamUrl = '';
                const extension = ep.containerExtension || 'mp4';
                if (window.AndroidApp) {
                    if (window.AndroidApp.getSeriesStreamUrl) {
                        streamUrl = window.AndroidApp.getSeriesStreamUrl(ep.id, extension);
                    } else {
                        streamUrl = `http://bkpac.cc/series/${window.AndroidApp.getUsername()}/${window.AndroidApp.getPassword()}/${ep.id}.${extension}`;
                    }
                } else {
                    streamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
                }

                if (streamUrl) {
                    playFullscreenVideo(streamUrl, ep.title || `Episódio ${ep.episodeNumber}`);
                }
            };
            card.onkeydown = (e) => { if (e.key === 'Enter') card.click(); };
            episodesContainer.appendChild(card);
        });
    }

    seasonsKeys.forEach((key, index) => {
        const tab = document.createElement('button');
        tab.className = 'season-tab';
        tab.tabIndex = 0;
        tab.textContent = `Temporada ${key}`;

        tab.onclick = () => {
            document.querySelectorAll('.season-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderSeasonEpisodes(key);
        };
        tab.onkeydown = (e) => { if (e.key === 'Enter') tab.click(); };

        tabsContainer.appendChild(tab);

        if (index === 0) {
            tab.classList.add('active');
            renderSeasonEpisodes(key);
        }
    });
};

function openVodModal(item, isSeries) {
    window._lastFocusedVodItem = document.activeElement;
    const topNav = document.querySelector('.top-nav');
    if (topNav) {
        window._detailPrevTopNavDisplay = topNav.style.display;
        topNav.style.display = 'none';
    }

    const screen   = document.getElementById('vod-detail-screen');
    const loader   = document.getElementById('vod-detail-loader');
    const backdrop = document.getElementById('vod-detail-backdrop');
    const poster   = document.getElementById('vod-detail-poster');
    const logoEl   = document.getElementById('vod-detail-logo');
    const titleEl  = document.getElementById('vod-detail-title');
    const origEl   = document.getElementById('vod-detail-original');
    const overviewEl = document.getElementById('vod-detail-overview');
    const dateEl   = document.getElementById('vod-detail-date');
    const genreEl  = document.getElementById('vod-detail-genre');
    const runtimeEl = document.getElementById('vod-detail-runtime');
    const creditsEl = document.getElementById('vod-detail-credits');
    const directorEl = document.getElementById('vod-detail-director');
    const castEl   = document.getElementById('vod-detail-cast');
    const relSection = document.getElementById('vod-detail-related-section');
    const relRow   = document.getElementById('vod-detail-related-row');
    const seriesSection = document.getElementById('vod-detail-series-section');

    // Guarda o item corrente para o botão Assistir
    window._vodDetailItem    = item;
    window._vodDetailSeries  = isSeries;
    window.currentTmdb       = null;

    // Salva em localStorage pra manter estado no F5
    localStorage.setItem('vodDetailItem', JSON.stringify(item));
    localStorage.setItem('vodDetailIsSeries', isSeries ? '1' : '0');

    // Reseta a tela
    if (loader)   loader.style.display   = 'block';
    if (backdrop) backdrop.style.backgroundImage = '';
    if (poster)   { poster.src = isSeries ? (item.cover || '') : (item.streamIcon || ''); }
    if (logoEl)   { logoEl.style.display = 'none'; logoEl.src = ''; }
    if (titleEl)  { titleEl.textContent = item.name || ''; titleEl.style.display = 'block'; }
    if (origEl)   origEl.textContent = '';
    if (overviewEl) overviewEl.textContent = 'Buscando informações...';
    if (dateEl)   dateEl.innerHTML = '';
    if (genreEl)  genreEl.innerHTML = '';
    if (runtimeEl) runtimeEl.innerHTML = '';
    if (creditsEl) creditsEl.style.display = 'none';
    if (relSection) relSection.style.display = 'none';
    if (relRow)   relRow.innerHTML = '';
    if (seriesSection) seriesSection.style.display = 'none';

    // Exibe a tela
    screen.style.display = 'flex';
    screen.scrollTop = 0;

    // Botão Voltar Redondo
    const btnBackRound = document.getElementById('vod-detail-screen-back-btn');
    if (btnBackRound) btnBackRound.onclick = closeVodModal;

    // Botão Favoritar (reusa lógica existente se disponível)
    const btnFav = document.getElementById('vod-detail-btn-fav');
    if (btnFav) {
        btnFav.onclick = () => {
            if (window.AndroidApp && window.AndroidApp.addFavorite) {
                window.AndroidApp.addFavorite(JSON.stringify(item));
            }
        };
    }

    // Botão Assistir
    const btnPlay = document.getElementById('vod-detail-btn-play');
    if (btnPlay) {
        btnPlay.onclick = () => {
            let streamUrl = '';
            if (window.AndroidApp) {
                if (window.AndroidApp.getVodStreamUrl) {
                    streamUrl = isSeries
                        ? window.AndroidApp.getSeriesStreamUrl(item.seriesId || item.streamId, item.containerExtension || 'mp4')
                        : window.AndroidApp.getVodStreamUrl(item.streamId, item.containerExtension || 'mp4');
                } else {
                    streamUrl = isSeries ? '' : window.AndroidApp.getStreamUrl(item.streamId);
                    if (streamUrl) streamUrl = streamUrl.replace('.ts', '.' + (item.containerExtension || 'mp4'));
                }
            } else {
                streamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
            }
            if (streamUrl) {
                playFullscreenVideo(streamUrl, item.name);
            }
        };
        setTimeout(() => btnPlay.focus(), 150);
    }

    // Busca TMDB
    fetchTmdbData(item.name, isSeries).then(tmdb => {
        window.currentTmdb = tmdb;
        if (loader) loader.style.display = 'none';

        if (tmdb) {
            // Backdrop
            if (tmdb.backdropUrl && backdrop) {
                backdrop.style.backgroundImage = `url('${tmdb.backdropUrl}')`;
            }
            // Poster
            if (tmdb.posterUrl && poster) poster.src = tmdb.posterUrl;
            // Logo / Título
            if (tmdb.logoUrl && logoEl) {
                logoEl.src = tmdb.logoUrl;
                logoEl.style.display = 'block';
                if (titleEl) titleEl.style.display = 'none';
            } else {
                if (titleEl) {
                    titleEl.textContent = tmdb.title || item.name || '';
                    titleEl.style.display = 'block';
                }
            }
            // Título original
            if (origEl && tmdb.originalTitle && tmdb.originalTitle !== (tmdb.title || item.name)) {
                origEl.textContent = tmdb.originalTitle;
            }
            // Overview
            if (overviewEl) overviewEl.textContent = tmdb.overview || '';
            
            // Metadata: renderização inteligente conforme imagens anexadas
            let metaHtml = '';
            if (isSeries) {
                if (tmdb.seasonsCount) {
                    metaHtml += `<span style="display:flex;align-items:center;gap:5px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> ${tmdb.seasonsCount} Temporadas</span>`;
                }
                if (tmdb.episodesCount) {
                    metaHtml += `<span style="display:flex;align-items:center;gap:5px;margin-left:10px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> ${tmdb.episodesCount} Episódios</span>`;
                }
            }
            if (tmdb.releaseDate) {
                metaHtml += `<span style="display:flex;align-items:center;gap:5px;margin-left:10px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${tmdb.releaseDate}</span>`;
            }
            if (tmdb.genres && tmdb.genres.length) {
                metaHtml += `<span style="display:flex;align-items:center;gap:5px;margin-left:10px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg> ${tmdb.genres.slice(0,3).join(', ')}</span>`;
            }
            if (!isSeries && tmdb.runtime) {
                const h = Math.floor(tmdb.runtime / 60), m = tmdb.runtime % 60;
                metaHtml += `<span style="display:flex;align-items:center;gap:5px;margin-left:10px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${h > 0 ? h + 'h ' : ''}${m}min</span>`;
            }
            if (isSeries && tmdb.voteAverage) {
                metaHtml += `<span style="display:flex;align-items:center;gap:5px;margin-left:10px;color:#f39c12;"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${tmdb.voteAverage}</span>`;
            }
            
            const metaContainer = document.getElementById('vod-detail-meta');
            if (metaContainer) metaContainer.innerHTML = metaHtml;

            // Créditos
            const hasDir = tmdb.director && tmdb.director.length;
            const hasCast = tmdb.cast && tmdb.cast.length;
            if ((hasDir || hasCast) && creditsEl) {
                if (hasDir && directorEl)  directorEl.innerHTML = `<span style="color:rgba(255,255,255,0.75)">Direção:</span> ${tmdb.director.join(', ')}`;
                if (hasCast && castEl)     castEl.innerHTML = `<span style="color:rgba(255,255,255,0.75)">Elenco:</span> ${tmdb.cast.slice(0,5).join(', ')}`;
                creditsEl.style.display = 'block';
            }
        } else {
            if (overviewEl) overviewEl.textContent = isSeries
                ? 'Temporadas incríveis esperam por você com ' + item.name + '.'
                : 'Prepare-se para grandes emoções com ' + item.name + '.';
        }

        // Se for série, busca os episódios via API ou mock
        if (isSeries) {
            if (window.AndroidApp && window.AndroidApp.getSeriesInfo) {
                window.AndroidApp.getSeriesInfo(item.seriesId || item.streamId);
            } else if (window.WebBridge && window.WebBridge.getSeriesInfo) {
                window.WebBridge.getSeriesInfo(item.seriesId || item.streamId);
            }
        } else {
            // Linha de filmes relacionados (apenas para VOD/filmes)
            const cacheKey = window._pendingCacheKey;
            const cached = cacheKey && window._vodCache && window._vodCache[cacheKey];
            if (cached && relRow && relSection) {
                try {
                    const list = JSON.parse(cached);
                    const others = list.filter(m => m.streamId !== item.streamId && m.streamIcon).slice(0, 15);
                    if (others.length > 0) {
                        others.forEach(m => {
                            const card = document.createElement('div');
                            card.className = 'vod-item';
                            card.tabIndex = 0;

                            let iconHtml = m.streamIcon
                                ? `<img src="${m.streamIcon}" class="vod-item-poster" onerror="this.style.display='none'">`
                                : '';

                            let cleanTitle = (m.name || '')
                                .replace(/\[.*?\]|\(.*?\)|\|.*?\|/g, ' ')
                                .replace(/\b(4K|FHD|UHD|1080p|720p|LEG|DUB|DUBLADO|LEGENDADO|CAM|TS|HDTS|TELESYNC)\b/gi, ' ')
                                .trim();

                            card.innerHTML = `${iconHtml}<div class="vod-item-title">${cleanTitle}</div>`;
                            card.onclick = () => openVodModal(m, isSeries);
                            card.onkeydown = (e) => { if (e.key === "Enter") card.click(); };
                            relRow.appendChild(card);
                        });
                        relSection.style.display = 'block';
                    }
                } catch(_) {}
            }
        }
    });
}

function closeVodModal() {
    const screen = document.getElementById('vod-detail-screen');
    if (screen) screen.style.display = 'none';

    // Restaura o topNav
    const topNav = document.querySelector('.top-nav');
    if (topNav && window._detailPrevTopNavDisplay !== undefined) {
        topNav.style.display = window._detailPrevTopNavDisplay;
    }

    // Limpa o estado do detalhe do localStorage
    localStorage.removeItem('vodDetailItem');
    localStorage.removeItem('vodDetailIsSeries');

    // Devolve o foco para o elemento que abriu a tela
    if (window._lastFocusedVodItem && typeof window._lastFocusedVodItem.focus === 'function') {
        setTimeout(() => {
            window._lastFocusedVodItem.focus();
        }, 50);
    }
}

function onVodCategoriesLoaded(jsonString) {
    let categories = [];
    try { categories = JSON.parse(jsonString); } catch(e) {}
    
    const container = document.getElementById('vod-categories-list');
    container.innerHTML = '';
    
    
    // Cache global para categorias VOD
    if (!window._vodCache) window._vodCache = {};
    window._currentVodType = 'vod';
    
    categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'live-category-item';
        div.tabIndex = 0;
        div.innerText = cat.categoryName;
        
        div.onclick = () => {
            document.querySelectorAll('#vod-categories-list .live-category-item, #vod-categories-list .favorites-category-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            
            const cacheKey = 'vod_' + cat.categoryId;
            
            // Se já tem no cache, renderiza instantaneamente
            if (window._vodCache[cacheKey]) {
                onVodListLoaded(window._vodCache[cacheKey], true);
            } else {
                // Mostra loader enquanto busca - Centralizado usando grid-column
                const grid = document.getElementById('vod-items-grid');
                grid.innerHTML = '<div style="grid-column: 1 / -1; display: flex; justify-content: center; align-items: center; min-height: 300px; width: 100%;"><l-spiral size="40" speed="0.9" color="#f39c12"></l-spiral></div>';
            }
            
            // Sempre busca do servidor (atualiza cache)
            if (window.AndroidApp) {
                window._pendingCacheKey = cacheKey;
                window.AndroidApp.getVodList(cat.categoryId);
            } else {
                const mockData = JSON.stringify([
                    {streamId: 201, name: "Filme Mock " + cat.categoryName, streamIcon: "https://image.tmdb.org/t/p/w500/mbYQWsHZkpcbgXrjcwJ8pKEOWi.jpg", rating: "8.5"},
                    {streamId: 202, name: "Homem-Aranha", streamIcon: "https://image.tmdb.org/t/p/w500/8qBylBsQf4llkGrjuCAlsqK9p13.jpg", rating: "9.0"}
                ]);
                window._vodCache[cacheKey] = mockData;
                onVodListLoaded(mockData, true);
            }
        };
        
        div.onkeydown = (e) => {
            if (e.key === "Enter") div.click();
        };
        
        container.appendChild(div);
    });
    
    if (categories.length > 0) {
        setTimeout(() => {
            const firstCat = container.querySelector('.live-category-item');
            if (firstCat) {
                firstCat.focus({ preventScroll: true });
                firstCat.click();
            }
        }, 50);
    }
}

function onVodListLoaded(jsonString, fromCache) {
    // Salva no cache
    if (!window._vodCache) window._vodCache = {};
    if (window._pendingCacheKey && !fromCache) {
        window._vodCache[window._pendingCacheKey] = jsonString;
    }
    
    let movies = [];
    try { movies = JSON.parse(jsonString); } catch(e) {}
    
    const container = document.getElementById('vod-items-grid');
    container.innerHTML = '';
    
    movies.forEach(m => {
        const div = document.createElement('div');
        div.className = 'vod-item';
        div.tabIndex = 0;
        
        let iconHtml = m.streamIcon ? `<img src="${m.streamIcon}" class="vod-item-poster" onerror="this.style.display='none'">` : '';
        const upperName = m.name ? m.name.toUpperCase() : '';
        let badgesHtml = '';
        if (upperName.includes('4K')) badgesHtml += '<div class="badge-4k">4K</div>';
        if (upperName.includes('LEG') || upperName.includes('LEGENDADO')) badgesHtml += '<div class="badge-leg">LEG</div>';
        if (upperName.match(/\b(CAM|TS|HDTS|TELESYNC)\b/)) badgesHtml += '<div class="badge-cam">CAM</div>';
        const badgeContainer = badgesHtml ? `<div class="badge-container">${badgesHtml}</div>` : '';
        
        const movieName = m.name || '';
        let cleanGridTitle = movieName.replace(/\[.*?\]|\(.*?\)|\|.*?\|/g, ' ').replace(/\b(4K|FHD|UHD|1080p|720p|LEG|DUB|DUBLADO|LEGENDADO|CAM|TS|HDTS|TELESYNC)\b/gi, ' ').trim();
        
        div.innerHTML = `${iconHtml}${badgeContainer}<div class="vod-item-title">${cleanGridTitle}</div>`;
        
        div.onclick = () => {
            openVodModal(m, false);
        };
        
        div.onkeydown = (e) => {
            if (e.key === "Enter") div.click();
        };
        
        container.appendChild(div);
    });
}

function onSeriesCategoriesLoaded(jsonString) {
    let categories = [];
    try { categories = JSON.parse(jsonString); } catch(e) {}
    
    const container = document.getElementById('vod-categories-list');
    container.innerHTML = '';
    
    
    // Cache global para categorias de Séries
    if (!window._seriesCache) window._seriesCache = {};
    window._currentVodType = 'series';
    
    categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'live-category-item';
        div.tabIndex = 0;
        div.innerText = cat.categoryName;
        
        div.onclick = () => {
            document.querySelectorAll('#vod-categories-list .live-category-item, #vod-categories-list .favorites-category-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            
            const cacheKey = 'series_' + cat.categoryId;
            
            // Se já tem no cache, renderiza instantaneamente
            if (window._seriesCache[cacheKey]) {
                onSeriesListLoaded(window._seriesCache[cacheKey], true);
            } else {
                // Mostra loader enquanto busca - Centralizado usando grid-column
                const grid = document.getElementById('vod-items-grid');
                grid.innerHTML = '<div style="grid-column: 1 / -1; display: flex; justify-content: center; align-items: center; min-height: 300px; width: 100%;"><l-spiral size="40" speed="0.9" color="#f39c12"></l-spiral></div>';
            }
            
            // Sempre busca do servidor (atualiza cache)
            if (window.AndroidApp) {
                window._pendingSeriesCacheKey = cacheKey;
                window.AndroidApp.getSeriesList(cat.categoryId);
            } else {
                const mockData = JSON.stringify([{seriesId: 301, name: "Série Mock " + cat.categoryName, cover: "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8Ez05SQ37I.jpg", rating: "9.0"}]);
                window._seriesCache[cacheKey] = mockData;
                onSeriesListLoaded(mockData, true);
            }
        };
        
        div.onkeydown = (e) => {
            if (e.key === "Enter") div.click();
        };
        
        container.appendChild(div);
    });
    
    if (categories.length > 0) {
        setTimeout(() => {
            const firstCat = container.querySelector('.live-category-item');
            if (firstCat) {
                firstCat.focus({ preventScroll: true });
                firstCat.click();
            }
        }, 50);
    }
}

function onSeriesListLoaded(jsonString, fromCache) {
    // Salva no cache
    if (!window._seriesCache) window._seriesCache = {};
    if (window._pendingSeriesCacheKey && !fromCache) {
        window._seriesCache[window._pendingSeriesCacheKey] = jsonString;
    }

    let series = [];
    try { series = JSON.parse(jsonString); } catch(e) {}
    
    const container = document.getElementById('vod-items-grid');
    container.innerHTML = '';
    
    series.forEach(s => {
        const div = document.createElement('div');
        div.className = 'vod-item';
        div.tabIndex = 0;
        
        let iconHtml = s.cover ? `<img src="${s.cover}" class="vod-item-poster" onerror="this.style.display='none'">` : '';
        const upperName = s.name ? s.name.toUpperCase() : '';
        let badgesHtml = '';
        if (upperName.includes('4K')) badgesHtml += '<div class="badge-4k">4K</div>';
        if (upperName.includes('LEG') || upperName.includes('LEGENDADO')) badgesHtml += '<div class="badge-leg">LEG</div>';
        if (upperName.match(/\b(CAM|TS|HDTS|TELESYNC)\b/)) badgesHtml += '<div class="badge-cam">CAM</div>';
        const badgeContainer = badgesHtml ? `<div class="badge-container">${badgesHtml}</div>` : '';
        
        const seriesName = s.name || '';
        let cleanGridTitle = seriesName.replace(/\[.*?\]|\(.*?\)|\|.*?\|/g, ' ').replace(/\b(4K|FHD|UHD|1080p|720p|LEG|DUB|DUBLADO|LEGENDADO|CAM|TS|HDTS|TELESYNC)\b/gi, ' ').trim();
        
        div.innerHTML = `${iconHtml}${badgeContainer}<div class="vod-item-title">${cleanGridTitle}</div>`;
        
        div.onclick = () => {
            openVodModal(s, true);
        };
        
        div.onkeydown = (e) => {
            if (e.key === "Enter") div.click();
        };
        
        container.appendChild(div);
    });
}
function onEpgLoaded(jsonString) {
    let epg = [];
    try { epg = JSON.parse(jsonString); } catch(e) {}
    
    const container = document.getElementById('live-epg-list');
    container.innerHTML = "";
    
    if (epg.length === 0) {
        container.innerHTML = "<div class='epg-item'>Sem programação disponível.</div>";
        return;
    }
    
    epg.forEach(prog => {
        const div = document.createElement('div');
        div.className = "epg-item";
        
        let title = prog.title;
        try { title = decodeURIComponent(escape(window.atob(prog.title))); } catch(e) {}
        
        let startTime = prog.start;
        // Trata data do XTREAM que vem como YYYY-MM-DD HH:mm:ss
        if (startTime && startTime.includes(' ')) {
            startTime = startTime.split(' ')[1].substring(0, 5); // Pega apenas HH:mm
        }
        
        div.innerHTML = `
            <div class="epg-time">${startTime}</div>
            <div class="epg-program-title">${title}</div>
        `;
        container.appendChild(div);
    });
}

function renderizarItens(jsonStringOrArray, targetElementId) {
    let items;
    if (typeof jsonStringOrArray === "string") {
        try { items = JSON.parse(jsonStringOrArray); }
        catch (e) { items = []; }
    } else {
        items = jsonStringOrArray;
    }

    const row = document.getElementById(targetElementId || "movie-row");
    if (!row) return;
    row.innerHTML = "";

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'tmdb-card';
        card.tabIndex = 0;

        const posterSrc = item.backdropUrl || item.poster || '';
        const posterImg = posterSrc
            ? `<img class="tmdb-card-poster" src="${posterSrc}" onerror="this.style.display='none'" />`
            : `<div class="tmdb-card-poster" style="background:#222;"></div>`;

        const logoImg = item.logoUrl
            ? `<img class="tmdb-card-logo" src="${item.logoUrl}" onerror="this.style.display='none'" />`
            : '';

        const title = item.name || item.title || '';
        const rating = item.voteAverage
            ? `<span class="tmdb-star">&#9733;</span><span class="tmdb-rating">${parseFloat(item.voteAverage).toFixed(1)}</span>`
            : '';
        const year = item.releaseYear ? `<span class="tmdb-year">${item.releaseYear}</span>` : '';
        const overview = item.overview ? `<div class="tmdb-card-overview">${item.overview}</div>` : '';

        card.innerHTML = `
            ${posterImg}
            <div class="tmdb-card-body">
                ${logoImg}
                <div class="tmdb-card-title">${title}</div>
                <div class="tmdb-card-meta">${rating}${year}</div>
                ${overview}
            </div>`;

        card.onclick = () => alert("Clicou em " + title);
        card.onkeydown = (e) => { if (e.key === "Enter") card.click(); };
        row.appendChild(card);
    });

    // Mostrar a seção correspondente
    const sectionMap = { 'movie-row': 'home-movies-section', 'series-row': 'home-series-section' };
    const sectionId = sectionMap[targetElementId];
    if (sectionId) {
        const sec = document.getElementById(sectionId);
        if (sec && items.length > 0) sec.style.display = 'block';
    }
}

// Navegação Espacial (D-PAD) Genérica para todas as páginas
document.addEventListener('keydown', function(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        
        const vkContainer = document.getElementById('virtual-keyboard');
        const isVkVisible = vkContainer && window.getComputedStyle(vkContainer).display !== 'none';
        
        const exitModal = document.getElementById('exit-confirm-modal');
        const isExitModalVisible = exitModal && window.getComputedStyle(exitModal).display !== 'none';
        
        const updateModal = document.getElementById('update-confirm-modal');
        const isUpdateModalVisible = updateModal && window.getComputedStyle(updateModal).display !== 'none';
        
        let focusables;
        if (isVkVisible) {
            focusables = Array.from(vkContainer.querySelectorAll('button, [tabindex="0"]'));
        } else if (isExitModalVisible) {
            focusables = Array.from(exitModal.querySelectorAll('button, [tabindex="0"]'));
        } else if (isUpdateModalVisible) {
            focusables = Array.from(updateModal.querySelectorAll('button, [tabindex="0"]'));
        } else {
            focusables = Array.from(document.querySelectorAll('input, button, [tabindex="0"]'));
        }
            
        let active = document.activeElement;
        const activeRow = active ? active.closest('.home-row') : null;
        if (activeRow && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
            focusables = Array.from(activeRow.querySelectorAll('.vod-item, [tabindex="0"]'));
        }

        focusables = focusables.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && 
                   window.getComputedStyle(el).visibility !== 'hidden' && 
                   window.getComputedStyle(el).display !== 'none';
        });
            
        if (focusables.length === 0) return;

        if (!focusables.includes(active)) {
            focusables[0].focus();
            e.preventDefault();
            return;
        }

        e.preventDefault(); // Impede scroll padrão do navegador na TV

        const activeRect = active.getBoundingClientRect();
        let bestCandidate = null;
        let minDistance = Infinity;

        focusables.forEach(cand => {
            if (cand === active) return;
            const candRect = cand.getBoundingClientRect();
            
            let isDirectionMatch = false;
            let distPrimary = 0;
            let distSecondary = 0;

            const activeCenter = { x: activeRect.left + activeRect.width/2, y: activeRect.top + activeRect.height/2 };
            const candCenter = { x: candRect.left + candRect.width/2, y: candRect.top + candRect.height/2 };

            const threshold = 10;
            if (e.key === 'ArrowUp' && candCenter.y < activeCenter.y - threshold) {
                isDirectionMatch = true;
                distPrimary = activeRect.top - candRect.bottom;
                distSecondary = Math.abs(activeCenter.x - candCenter.x);
            } else if (e.key === 'ArrowDown' && candCenter.y > activeCenter.y + threshold) {
                isDirectionMatch = true;
                distPrimary = candRect.top - activeRect.bottom;
                distSecondary = Math.abs(activeCenter.x - candCenter.x);
            } else if (e.key === 'ArrowLeft' && candCenter.x < activeCenter.x - threshold) {
                isDirectionMatch = true;
                distPrimary = activeRect.left - candRect.right;
                distSecondary = Math.abs(activeCenter.y - candCenter.y);
            } else if (e.key === 'ArrowRight' && candCenter.x > activeCenter.x + threshold) {
                isDirectionMatch = true;
                distPrimary = candRect.left - activeRect.right;
                distSecondary = Math.abs(activeCenter.y - candCenter.y);
            }

            if (isDirectionMatch) {
                if (distPrimary < 0) distPrimary = 0; // Sobreposição parcial
                
                // Distância ponderada para favorecer o alinhamento
                const distance = Math.sqrt(Math.pow(distPrimary, 2) + Math.pow(distSecondary * 2, 2));
                
                if (distance < minDistance) {
                    minDistance = distance;
                    bestCandidate = cand;
                }
            }
        });

        if (bestCandidate) {
            bestCandidate.focus({ preventScroll: true });
            if (bestCandidate.closest('.top-nav')) {
                const scrollArea = document.querySelector('.home-scroll-area');
                if (scrollArea) {
                    scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } else {
                bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            }
        }
    }
});

// =======================================================
// VIRTUAL KEYBOARD LOGIC
// =======================================================
let currentInput = null;
let isShift = false;
let isNumbers = false;

// Open Keyboard when clicking input — only if login screen is visible
document.getElementById('username').addEventListener('click', () => {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen && loginScreen.style.display !== 'none') openKeyboard('username');
});
document.getElementById('password').addEventListener('click', () => {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen && loginScreen.style.display !== 'none') openKeyboard('password');
});
// Para suportar navegação via Enter pelo D-PAD no input:
document.getElementById('username').addEventListener('keydown', (e) => { if(e.key === 'Enter') { const ls = document.getElementById('login-screen'); if(ls && ls.style.display !== 'none') openKeyboard('username'); } });
document.getElementById('password').addEventListener('keydown', (e) => { if(e.key === 'Enter') { const ls = document.getElementById('login-screen'); if(ls && ls.style.display !== 'none') openKeyboard('password'); } });

// Garante que botões de ação respondam ao Enter do D-PAD/Controle Remoto
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const active = document.activeElement;
        if (active && active.classList.contains('action-btn')) {
            e.preventDefault();
            active.click();
        }
    }
});

let isKeyboardOpen = false;

function openKeyboard(inputId) {
    currentInput = document.getElementById(inputId);
    const vk = document.getElementById('virtual-keyboard');
    vk.style.display = 'flex';
    isKeyboardOpen = true;
    // Foca na primeira tecla 'q'
    setTimeout(() => { document.querySelector('.vk-key').focus(); }, 100);
}

function closeKeyboard() {
    document.getElementById('virtual-keyboard').style.display = 'none';
    isKeyboardOpen = false;
    if(currentInput) currentInput.focus();
    currentInput = null;
}

// Teclas do teclado virtual
document.querySelectorAll('.vk-key').forEach(key => {
    key.addEventListener('click', function(e) {
        e.preventDefault();
        handleKeyPress(this);
    });
    // Tratar Enter do controle remoto (D-PAD)
    key.addEventListener('keydown', function(e) {
        if(e.key === 'Enter') {
            e.preventDefault(); 
            handleKeyPress(this);
        }
    });
});

function handleKeyPress(keyElement) {
    if(!currentInput) return;
    
    let val = keyElement.getAttribute('data-val') || keyElement.innerText;
    
    if (val === 'SUBMIT') {
        closeKeyboard();
        return;
    }
    if (val === 'CLEAR') {
        currentInput.value = '';
        return;
    }
    if (val === 'BACKSPACE' || val === '⌫') {
        currentInput.value = currentInput.value.slice(0, -1);
        return;
    }
    if (val === 'SHIFT' || val === '⬆') {
        isShift = !isShift;
        updateKeyboardCase();
        return;
    }
    if (val === '123' || val === 'ABC') {
        isNumbers = !isNumbers;
        updateKeyboardLayout();
        keyElement.innerText = isNumbers ? 'ABC' : '123';
        keyElement.setAttribute('data-val', isNumbers ? 'ABC' : '123');
        return;
    }
    
    // Default char insertion
    let charToInsert = isShift ? val.toUpperCase() : val.toLowerCase();
    if(val === ' ') charToInsert = ' ';
    currentInput.value += charToInsert;
}

function updateKeyboardCase() {
    document.querySelectorAll('.vk-row:not(#vk-row-3) .vk-key').forEach(key => {
        if(key.innerText.length === 1 && /[a-zA-Z]/.test(key.innerText)) {
            key.innerText = isShift ? key.innerText.toUpperCase() : key.innerText.toLowerCase();
        }
    });
}

function updateKeyboardLayout() {
    const letters = [
        ['q','w','e','r','t','y','u','i','o','p'],
        ['a','s','d','f','g','h','j','k','l','/'],
        ['z','x','c','v','b','n','m','?','\\']
    ];
    const numbers = [
        ['1','2','3','4','5','6','7','8','9','0'],
        ['@','#','$','%','&','*','-','+','(',')'],
        ['!','"','\'',':',';',',','.','~','_']
    ];
    
    const layout = isNumbers ? numbers : letters;
    
    for(let i=0; i<3; i++) {
        const rowKeys = document.querySelectorAll(`#vk-row-${i} .vk-key`);
        rowKeys.forEach((key, index) => {
            if (index < layout[i].length) {
                key.innerText = isShift ? layout[i][index].toUpperCase() : layout[i][index];
            }
        });
    }
}

// Navegação Espacial Complexa para o Teclado
document.addEventListener('keydown', function(e) {
    // Este listener só age quando o teclado virtual está aberto
    if (!isKeyboardOpen) return;
    
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Deixa o WebView nativo da TV fazer a navegação espacial perfeitamente
    } else if (e.key === 'Escape') {
        // NÃO fazer nada aqui — o listener global (linha ~1642) cuida do Escape usando isKeyboardOpen
        // Se tratarmos aqui, o evento continua borbulhando para o listener global
    } else if (e.key === 'Backspace') {
        if (currentInput && currentInput.value.length > 0) {
            currentInput.value = currentInput.value.slice(0, -1);
        } else {
            closeKeyboard();
        }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        // Suporte para Ctrl+V (Colar) no PC
        if (currentInput && navigator.clipboard) {
            navigator.clipboard.readText().then(text => {
                currentInput.value += text;
            }).catch(err => console.error("Erro ao colar:", err));
        }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Suporte para digitar usando o teclado físico do PC enquanto o teclado virtual está aberto
        if (currentInput) {
            currentInput.value += e.key;
        }
    }
});

function voltarParaInicio(e) {
    const homeScreen = document.getElementById('home-screen');
    const loginScreen = document.getElementById('login-screen');
    const topNav = document.querySelector('.top-nav');
    
    // Se não estiver na tela de login, e o menu superior estiver escondido (significa que está em uma categoria)
    if (loginScreen.style.display === 'none' && topNav && topNav.style.display === 'none') {
        const btnInicio = Array.from(document.querySelectorAll('.nav-item')).find(el => el.innerText.trim() === 'Início');
        mostrarCategoria(btnInicio || document.querySelector('.nav-item'), 'inicio');
        if(e) e.preventDefault();
        
        // Foca no menu novamente para facilitar a navegação da TV
        setTimeout(() => { if(btnInicio) btnInicio.focus(); }, 100);
    }
}

// Auto-login se já estiver salvo no navegador (para testes web com F5 ou botão Recarregar)
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('logged_in_user');
    const savedItem = localStorage.getItem('vodDetailItem');

    // Se tem detalhe salvo, só restaura detalhe (F5 na página de detalhe)
    // Se não tem detalhe, faz sync completo (primeira vez ou login)
    if (savedUser) {
        if (savedItem) {
            // F5 na página de detalhe - só restaura o detalhe, sem sync
            const usernameInput = document.getElementById('username');
            const loginScreen = document.getElementById('login-screen');
            const homeScreen = document.getElementById('home-screen');
            if (loginScreen) loginScreen.style.display = 'none';
            if (homeScreen) homeScreen.style.display = 'block';

            setTimeout(() => {
                try {
                    const item = JSON.parse(savedItem);
                    const isSeries = localStorage.getItem('vodDetailIsSeries') === '1';
                    openVodModal(item, isSeries);
                } catch (e) {
                    localStorage.removeItem('vodDetailItem');
                    localStorage.removeItem('vodDetailIsSeries');
                }
            }, 300);
        } else {
            // Primeira vez ou login - sincroniza completo
            recarregar();
        }
    } else {
        setTimeout(() => {
            const usernameInput = document.getElementById('username');
            if (usernameInput) usernameInput.focus();
        }, 200);
    }

    // Atualiza a versão exibida na tela de login dinamicamente
    const versionEl = document.querySelector('.version');
    if (versionEl) {
        if (window.AndroidApp && typeof window.AndroidApp.getAppVersion === 'function') {
            versionEl.innerText = "Versão " + window.AndroidApp.getAppVersion();
        }
    }

});

// ==========================================
// MpegTS Video Player
// ==========================================
let mpegtsPlayer = null;

function playLiveStream(url) {
    const videoElement = document.getElementById('live-player');
    const overlay = document.getElementById('live-player-overlay');
    const loader = document.getElementById('live-player-loader');
    
    if (!videoElement || typeof mpegts === 'undefined') return;
    
    // Mostra o overlay e o loader enquanto o vídeo carrega
    if (overlay) overlay.style.display = 'block';
    if (loader) loader.style.display = 'block';
    
    if (mpegtsPlayer) {
        mpegtsPlayer.destroy();
        mpegtsPlayer = null;
    }
    
    // Oculta o loader e o overlay assim que o vídeo começar a rodar
    videoElement.onplaying = () => {
        if (overlay) overlay.style.display = 'none';
        if (loader) loader.style.display = 'none';
    };
    
    if (mpegts.getFeatureList().mseLivePlayback) {
        mpegtsPlayer = mpegts.createPlayer({
            type: 'mpegts',
            isLive: true,
            url: url
        });
        mpegtsPlayer.attachMediaElement(videoElement);
        mpegtsPlayer.load();
        mpegtsPlayer.play().catch(e => console.log('Autoplay prevented:', e));
    }
}

// ==========================================
// CUSTOM FULLSCREEN PLAYER CONTROLS
// ==========================================
function setupFullscreenPlayer() {
    const fsContainer = document.getElementById('fs-player-container');
    const fsPlayer = document.getElementById('fullscreen-player');
    if (!fsContainer || !fsPlayer) return;

    const fsUi = document.getElementById('fs-ui');
    const btnPlay = document.getElementById('fs-btn-play');
    const iconPlay = document.getElementById('fs-icon-play');
    const iconPause = document.getElementById('fs-icon-pause');
    const progress = document.getElementById('fs-progress');
    const timeCurrent = document.getElementById('fs-time-current');
    const timeTotal = document.getElementById('fs-time-total');
    const btnBack = document.getElementById('fs-btn-back');
    const btnFullscreen = document.getElementById('fs-btn-fullscreen');

    let uiTimeout;
    const showUi = () => {
        fsUi.style.opacity = '1';
        fsContainer.style.cursor = 'default';
        clearTimeout(uiTimeout);
        uiTimeout = setTimeout(() => {
            if (!fsPlayer.paused) {
                fsUi.style.opacity = '0';
                fsContainer.style.cursor = 'none';
            }
        }, 3500);
    };
    
    fsContainer.addEventListener('mousemove', showUi);
    fsContainer.addEventListener('touchstart', showUi);
    // NÃO colocar click genérico no fsContainer para não conflitar com os botões

    const formatTime = (seconds) => {
        if (isNaN(seconds) || !isFinite(seconds)) return "00:00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    };

    fsPlayer.addEventListener('timeupdate', () => {
        if (!fsPlayer.duration) return;
        if (!progress.matches(':active')) {
            progress.value = (fsPlayer.currentTime / fsPlayer.duration) * 100;
        }
        timeCurrent.innerText = formatTime(fsPlayer.currentTime);
        timeTotal.innerText = "-" + formatTime(fsPlayer.duration - fsPlayer.currentTime);
    });

    progress.addEventListener('input', () => {
        fsPlayer.currentTime = (progress.value / 100) * fsPlayer.duration;
    });

    const togglePlay = (e) => {
        if(e) e.stopPropagation();
        if (fsPlayer.paused) fsPlayer.play();
        else fsPlayer.pause();
    };

    btnPlay.addEventListener('click', togglePlay);
    fsPlayer.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlay();
    });

    const btnRewind = document.getElementById('fs-btn-rewind');
    const btnForward = document.getElementById('fs-btn-forward');

    if (btnRewind) {
        btnRewind.addEventListener('click', (e) => {
            e.stopPropagation();
            fsPlayer.currentTime = Math.max(0, fsPlayer.currentTime - 10);
            showUi();
        });
    }

    if (btnForward) {
        btnForward.addEventListener('click', (e) => {
            e.stopPropagation();
            let newTime = fsPlayer.currentTime + 10;
            if (!isNaN(fsPlayer.duration) && isFinite(fsPlayer.duration) && fsPlayer.duration > 0) {
                newTime = Math.min(fsPlayer.duration, newTime);
            }
            fsPlayer.currentTime = newTime;
            showUi();
        });
    }

    // Suporte para o seletor do controle remoto (Enter)
    document.querySelectorAll('.fs-control-btn').forEach(btn => {
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                btn.click();
            }
        });
    });

    fsPlayer.addEventListener('play', () => {
        iconPlay.style.display = 'none';
        iconPause.style.display = 'block';
        showUi();
    });

    fsPlayer.addEventListener('pause', () => {
        iconPause.style.display = 'none';
        iconPlay.style.display = 'block';
        showUi();
    });

    btnBack.addEventListener('click', (e) => {
        if(e) e.stopPropagation();
        closeFullscreenPlayer();
    });

    btnFullscreen.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement && !document.webkitIsFullScreen) {
            if (fsContainer.requestFullscreen) fsContainer.requestFullscreen();
            else if (fsContainer.webkitRequestFullscreen) fsContainer.webkitRequestFullscreen();
        } else {
            if(document.exitFullscreen) document.exitFullscreen();
            else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
    });

    const onFullscreenChange = () => {
        if (!document.fullscreenElement && !document.webkitIsFullScreen) {
            // Só encerra se o usuário explicitamente saiu do fullscreen sem ser pelo botão Voltar
        }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
}

let fsMpegtsPlayer = null;
window.isFullscreenLive = false;

function updateFullscreenControlsVisibility() {
    const rewind = document.getElementById('fs-btn-rewind');
    const forward = document.getElementById('fs-btn-forward');
    const progress = document.getElementById('fs-progress');
    const timeCurrent = document.getElementById('fs-time-current');
    const timeTotal = document.getElementById('fs-time-total');
    const btnFullscreen = document.getElementById('fs-btn-fullscreen');
    const controlsRow = document.getElementById('fs-controls-row');
    
    const displayStyle = window.isFullscreenLive ? 'none' : 'block';
    
    if (rewind) rewind.style.display = displayStyle;
    if (forward) forward.style.display = displayStyle;
    if (progress) progress.style.display = displayStyle;
    if (timeCurrent) timeCurrent.style.display = displayStyle;
    if (timeTotal) timeTotal.style.display = displayStyle;
    if (btnFullscreen) btnFullscreen.style.display = displayStyle;
    
    if (controlsRow) {
        if (window.isFullscreenLive) {
            controlsRow.style.justifyContent = 'center';
        } else {
            controlsRow.style.justifyContent = 'flex-start';
        }
    }
}

function playLiveFullscreen(url, name) {
    const fsContainer = document.getElementById('fs-player-container');
    const fsPlayer = document.getElementById('fullscreen-player');
    const fsLogo = document.getElementById('fs-logo');
    const fsTitle = document.getElementById('fs-title');
    
    if (!fsContainer || !fsPlayer) return;
    
    window.isFullscreenLive = true;
    updateFullscreenControlsVisibility();
    
    // Para o player de preview
    if (mpegtsPlayer) {
        mpegtsPlayer.destroy();
        mpegtsPlayer = null;
    }
    const videoElement = document.getElementById('live-player');
    if (videoElement) {
        videoElement.pause();
        videoElement.src = '';
    }
    
    fsContainer.style.display = 'block';
    
    // Oculta a logo do VOD e exibe o título do canal
    if (fsLogo) fsLogo.style.display = 'none';
    if (fsTitle) {
        fsTitle.innerText = name;
        fsTitle.style.display = 'none'; // REMOVIDO: Não exibe mais título em texto
    }
    
    // Inicia o player mpegts no fullscreen-player
    if (fsMpegtsPlayer) {
        fsMpegtsPlayer.destroy();
        fsMpegtsPlayer = null;
    }
    
    if (typeof mpegts !== 'undefined' && mpegts.getFeatureList().mseLivePlayback) {
        fsMpegtsPlayer = mpegts.createPlayer({
            type: 'mpegts',
            isLive: true,
            url: url
        });
        fsMpegtsPlayer.attachMediaElement(fsPlayer);
        fsMpegtsPlayer.load();
        fsMpegtsPlayer.play().catch(e => console.log('Autoplay prevented:', e));
    } else {
        fsPlayer.src = url;
        fsPlayer.play().catch(e => console.log('Autoplay prevented:', e));
    }
    
    // Foca no botão play do fullscreen
    setTimeout(() => {
        const focusBtn = document.getElementById('fs-btn-play');
        if (focusBtn) focusBtn.focus();
    }, 200);
    
    if (fsContainer.requestFullscreen) {
        fsContainer.requestFullscreen();
    } else if (fsContainer.webkitRequestFullscreen) {
        fsContainer.webkitRequestFullscreen();
    }
}

function closeFullscreenPlayer() {
    const fsContainer = document.getElementById('fs-player-container');
    const fsPlayer = document.getElementById('fullscreen-player');
    if (!fsContainer || !fsPlayer) return;

    if (document.fullscreenElement || document.webkitIsFullScreen) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
    
    if (fsMpegtsPlayer) {
        fsMpegtsPlayer.destroy();
        fsMpegtsPlayer = null;
    }

    fsPlayer.pause();
    fsPlayer.src = '';
    fsContainer.style.display = 'none';
    
    // Restaura o canal que estava tocando no mini-player
    const activeChannel = document.querySelector('.live-channel-item.active');
    if (activeChannel) {
        reiniciarPreviewCanal(activeChannel);
        setTimeout(() => activeChannel.focus(), 100);
    }
}

function reiniciarPreviewCanal(itemElement) {
    const ch = itemElement._channelData;
    if (!ch) return;
    
    document.getElementById('live-player-title').innerText = "Assistindo: " + ch.name;
    
    if (window.AndroidApp) {
        window.AndroidApp.getEpg(ch.streamId);
        let streamUrl = window.AndroidApp.getStreamUrl(ch.streamId);
        if (streamUrl) playLiveStream(streamUrl);
    } else {
        onEpgLoaded(JSON.stringify([{title: "Programa Mock", start: "10:00", end: "11:00", description: "Descrição..."}]));
        const videoElement = document.getElementById('live-player');
        document.getElementById('live-player-overlay').style.display = 'none';
        videoElement.src = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
        videoElement.play();
    }
}

setupFullscreenPlayer();

// Sincronizar foco do seletor (D-PAD) com o hover do mouse, mas evitando capturas involuntárias
let lastMouseX = 0;
let lastMouseY = 0;
let mouseActive = false;

document.addEventListener('mousemove', (e) => {
    if (e.clientX !== lastMouseX || e.clientY !== lastMouseY) {
        mouseActive = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});

document.addEventListener('keydown', () => {
    mouseActive = false;
});

document.addEventListener('mouseover', (e) => {
    if (!mouseActive) return;
    const focusable = e.target.closest('[tabindex="0"], button, input, select, textarea, .nav-item, .live-category-item, .live-channel-item, .tmdb-card, .sk-key, .vod-item');
    if (focusable && document.activeElement !== focusable) {
        focusable.focus({ preventScroll: true });
    }
}, true);

// =======================================================
// BUSCA E TECLADO VIRTUAL (Estilo Anexo 2)
// =======================================================
function initSearchKeyboard() {
    const inputField = document.getElementById('search-input-field');
    const keys = document.querySelectorAll('.sk-key');
    
    keys.forEach(key => {
        key.onclick = (e) => {
            e.stopPropagation();
            const val = key.getAttribute('data-val') || key.innerText;
            
            if (val === 'BACKSPACE') {
                inputField.value = inputField.value.slice(0, -1);
            } else if (val === 'CLEAR') {
                inputField.value = '';
            } else {
                inputField.value += val;
            }
            
            realizarBusca(inputField.value);
        };

        // Removido onkeydown manual para evitar disparar duas vezes (já que é um elemento button nativo que responde ao Enter)
    });
}

let searchTimeout = null;

function realizarBusca(query) {
    const placeholder = document.getElementById('search-results-placeholder');
    const container = document.getElementById('search-results-container');
    
    if (!query || query.trim() === '') {
        if (searchTimeout) clearTimeout(searchTimeout);
        placeholder.style.display = 'block';
        placeholder.innerText = 'Digite para pesquisar conteúdos.';
        if (container) container.style.display = 'none';
        return;
    }
    
    // Mostra o spinner de carregamento no painel direito
    placeholder.style.display = 'block';
    placeholder.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:150px;width:100%;"><l-spiral size="45" speed="0.9" color="#f39c12"></l-spiral></div>';
    if (container) container.style.display = 'none';
    
    // Debounce de 300ms para evitar requisições paralelas ao digitar rápido
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (window.AndroidApp && window.AndroidApp.searchContent) {
            window.AndroidApp.searchContent(query);
        } else {
            // Fallback para WebPlayer (se necessário)
            const clean = query.trim().toLowerCase();
            const mockResults = [
                { id: 201, name: "Avatar: O Caminho da Água", streamIcon: "https://image.tmdb.org/t/p/w500/mbYQWsHZkpcbgXrjcwJ8pKEOWi.jpg", rating: "7.6", type: "movie" },
                { id: 202, name: "Homem-Aranha", streamIcon: "https://image.tmdb.org/t/p/w500/8qBylBsQf4llkGrjuCAlsqK9p13.jpg", rating: "9.0", type: "movie" },
                { id: 203, name: "Batman", streamIcon: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg", rating: "7.8", type: "movie" },
                { id: 204, name: "Duna: Parte 2", streamIcon: "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8Ez05SQ37I.jpg", rating: "8.4", type: "movie" },
                { id: 301, name: "The Last of Us", streamIcon: "https://image.tmdb.org/t/p/w500/uDgy6hyPd7qkjd57QKPauAdyKGT.jpg", rating: "8.8", type: "series" },
                { id: 302, name: "House of Dragon", streamIcon: "https://image.tmdb.org/t/p/w500/etj8E2o0Bud0HkONVQPjyCkIvpv.jpg", rating: "8.4", type: "series" }
            ];
            const filtered = mockResults.filter(r => r.name.toLowerCase().includes(clean));
            onSearchResultsLoaded(JSON.stringify(filtered));
        }
    }, 300);
}

function onSearchResultsLoaded(jsonString) {
    const placeholder = document.getElementById('search-results-placeholder');
    const container = document.getElementById('search-results-container');
    const moviesSection = document.getElementById('search-movies-section');
    const moviesGrid = document.getElementById('search-movies-grid');
    const seriesSection = document.getElementById('search-series-section');
    const seriesGrid = document.getElementById('search-series-grid');
    
    let results = [];
    try { results = JSON.parse(jsonString); } catch(e) {}
    
    if (results.length === 0) {
        placeholder.style.display = 'block';
        placeholder.innerText = 'Nenhum conteúdo encontrado.';
        container.style.display = 'none';
        return;
    }
    
    placeholder.style.display = 'none';
    container.style.display = 'block';
    
    // Separa os resultados
    const movies = results.filter(item => item.type === 'movie');
    const series = results.filter(item => item.type === 'series');
    
    // Renderiza Filmes
    if (movies.length > 0) {
        moviesSection.style.display = 'block';
        moviesGrid.innerHTML = '';
        movies.forEach(item => {
            const div = createSearchCard(item, false);
            moviesGrid.appendChild(div);
        });
    } else {
        moviesSection.style.display = 'none';
        moviesGrid.innerHTML = '';
    }
    
    // Renderiza Séries
    if (series.length > 0) {
        seriesSection.style.display = 'block';
        seriesGrid.innerHTML = '';
        series.forEach(item => {
            const div = createSearchCard(item, true);
            seriesGrid.appendChild(div);
        });
    } else {
        seriesSection.style.display = 'none';
        seriesGrid.innerHTML = '';
    }
}

function createSearchCard(item, isSeries) {
    const div = document.createElement('div');
    div.className = 'vod-item';
    div.tabIndex = 0;
    
    let iconHtml = item.streamIcon ? `<img src="${item.streamIcon}" class="vod-item-poster" onerror="this.style.display='none'">` : '';
    const upperName = item.name ? item.name.toUpperCase() : '';
    let badgesHtml = '';
    if (upperName.includes('4K')) badgesHtml += '<div class="badge-4k">4K</div>';
    if (upperName.includes('LEG') || upperName.includes('LEGENDADO')) badgesHtml += '<div class="badge-leg">LEG</div>';
    if (upperName.match(/\b(CAM|TS|HDTS|TELESYNC)\b/)) badgesHtml += '<div class="badge-cam">CAM</div>';
    const badgeContainer = badgesHtml ? `<div class="badge-container">${badgesHtml}</div>` : '';
    
    const itemName = item.name || '';
    let cleanGridTitle = itemName.replace(/\[.*?\]|\(.*?\)|\|.*?\|/g, ' ').replace(/\b(4K|FHD|UHD|1080p|720p|LEG|DUB|DUBLADO|LEGENDADO|CAM|TS|HDTS|TELESYNC)\b/gi, ' ').trim();
    
    div.innerHTML = `${iconHtml}${badgeContainer}<div class="vod-item-title">${cleanGridTitle}</div>`;
    
    div.onclick = () => {
        openVodModal({
            streamId: item.id,
            seriesId: item.id,
            name: item.name,
            streamIcon: item.streamIcon,
            cover: item.streamIcon
        }, isSeries);
    };
    
    div.onkeydown = (e) => {
        if (e.key === "Enter") div.click();
    };
    
    return div;
}

// Controlador unificado de navegação para botão Voltar (Escape / Back remoto)
window.handleAndroidBack = function() {
    // Se o mini-player de TV ao vivo estiver em tela cheia, sai da tela cheia
    const previewContainer = document.querySelector('.live-player-container');
    if (document.fullscreenElement === previewContainer || document.webkitFullscreenElement === previewContainer) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        
        const activeChannel = document.querySelector('.live-channel-item.active');
        if (activeChannel) {
            setTimeout(() => activeChannel.focus(), 100);
        }
        return;
    }

    // -1. Se o modal de confirmação de saída estiver aberto, fecha ele
    const exitModal = document.getElementById('exit-confirm-modal');
    if (exitModal && exitModal.style.display !== 'none') {
        fecharExitModal();
        return;
    }

    // 0. Se o teclado virtual estiver aberto, fecha ele
    const vkContainer = document.getElementById('virtual-keyboard');
    if (vkContainer && vkContainer.style.display !== 'none') {
        closeKeyboard();
        return;
    }

    // 1. Se o player de vídeo em tela cheia estiver aberto, fecha ele
    const playerContainer = document.getElementById('fs-player-container');
    if (playerContainer && playerContainer.style.display !== 'none') {
        closeFullscreenPlayer();
        return;
    }

    // 2. Se a tela de detalhes do VOD estiver aberta, fecha ela
    const vodDetailScreen = document.getElementById('vod-detail-screen');
    if (vodDetailScreen && vodDetailScreen.style.display !== 'none') {
        closeVodModal();
        return;
    }

    // 3. Se a tela de busca estiver aberta, fecha e volta para o Início
    const searchScreen = document.getElementById('search-tv-screen');
    if (searchScreen && searchScreen.style.display !== 'none') {
        const inicioBtn = document.querySelector('.nav-item');
        mostrarCategoria(inicioBtn, 'inicio');
        return;
    }

    // 4. Se estiver em TV, Filmes ou Séries, volta para o Início
    const activeTab = document.querySelector('.nav-item.active');
    if (activeTab && !activeTab.innerText.toLowerCase().includes('início') && !activeTab.innerText.toLowerCase().includes('inicio')) {
        const inicioBtn = document.querySelector('.nav-item');
        if (inicioBtn) {
            mostrarCategoria(inicioBtn, 'inicio');
            return;
        }
    }

    // 5. Se já estiver no Início, mostra o modal de confirmação de saída
    abrirExitModal();
};

// Escuta a tecla de Escape (teclado físico/navegador/WebView)
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        e.preventDefault();
        
        // Se o teclado virtual estiver aberto, fecha ele e NÃO chama o modal de saída
        if (isKeyboardOpen) {
            closeKeyboard();
            return; // bloqueia o modal de saída
        }
        
        window.handleAndroidBack();
    }
});

// Inicializar teclado de busca
initSearchKeyboard();

// =======================================================
// EXIT CONFIRMATION MODAL LOGIC
// =======================================================
let lastFocusedBeforeExit = null;

function abrirExitModal() {
    lastFocusedBeforeExit = document.activeElement;
    const modal = document.getElementById('exit-confirm-modal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        // Foca no botão "Não" por padrão por segurança
        setTimeout(() => {
            const btnNo = document.getElementById('exit-btn-no');
            if (btnNo) btnNo.focus();
        }, 100);
    }
}

function fecharExitModal() {
    const modal = document.getElementById('exit-confirm-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            if (lastFocusedBeforeExit) {
                lastFocusedBeforeExit.focus();
                lastFocusedBeforeExit = null;
            }
        }, 300);
    }
}

function confirmarSaida() {
    if (window.AndroidApp && window.AndroidApp.exitApp) {
        window.AndroidApp.exitApp();
    }
}

// =======================================================
// AUTO-UPDATE MODAL LOGIC
// =======================================================

