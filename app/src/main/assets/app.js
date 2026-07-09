// Funções de Login
function fazerLogin() {
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const status = document.getElementById("login-status");

    if (!user || !pass) {
        status.innerText = "Preencha usuário e senha";
        return;
    }

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
    
    // Mostra tela de sincronização
    document.getElementById("sync-screen").style.display = "flex";
    document.getElementById("sync-status-text").innerText = "Sincronizando banco de dados...";
    document.getElementById("sync-progress").style.width = "0%";
    
    // Verifica atualizações ao mesmo tempo
    if (window.AndroidApp && typeof window.AndroidApp.checkForUpdates === 'function') {
        window.AndroidApp.checkForUpdates();
    }
    
    if (window.AndroidApp && user && pass) {
        window.AndroidApp.login(user, pass);
    } else {
        // Fallback case
        setTimeout(() => window.location.reload(), 1000);
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

// Funções de Navegação e Conteúdo
function mostrarCategoria(btn, cat) {
    localStorage.setItem('current_category', cat);
    
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
        
        const exploreBtn = document.querySelector('.explore-btn-container');
        if (exploreBtn) exploreBtn.style.display = 'flex';
        
        if (window.AndroidApp) {
            window.AndroidApp.getBannerItems();
            window.AndroidApp.loadCategory('filmes');
            setTimeout(() => window.AndroidApp.loadCategory('series'), 500); 
        } else {
            onBannerItemsLoaded(JSON.stringify([
                {
                    title: "O Conde de Monte Cristo",
                    overview: "O jovem Edmond Dantès é alvo de uma trama sinistra e acaba sendo preso no dia de seu casamento. Após 14 anos, ele consegue fugir e assume a identidade do Conde de Monte Cristo para se vingar.",
                    backdropUrl: "https://image.tmdb.org/t/p/original/9kcTsX2laYclN4bFiMH3RuhZel2.jpg",
                    logoUrl: "https://placehold.co/400x120/transparent/white?text=Monte+Cristo",
                    releaseYear: "2024", voteAverage: 8.5, ageRating: "14"
                },
                {
                    title: "Avatar: O Caminho da Água",
                    overview: "Jake Sully vive com sua nova família formada em Pandora. Uma vez que uma velha ameaça retorna para terminar o que foi iniciado anteriormente, Jake deve trabalhar com Neytiri e o exército da raça Na'vi para proteger seu planeta.",
                    backdropUrl: "https://image.tmdb.org/t/p/original/s16H6tpK2utvwpaozVfFpv8mBT.jpg",
                    logoUrl: "https://placehold.co/400x120/transparent/white?text=Avatar+2",
                    releaseYear: "2022", voteAverage: 7.6, ageRating: "12"
                },
                {
                    title: "Duna: Parte 2",
                    overview: "Paul Atreides une-se a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família. De frente com uma escolha entre o amor de sua vida e o destino do universo, ele tenta evitar um terrível futuro.",
                    backdropUrl: "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
                    logoUrl: "https://placehold.co/400x120/transparent/white?text=Duna+2",
                    releaseYear: "2024", voteAverage: 8.4, ageRating: "14"
                },
                {
                    title: "Deadpool & Wolverine",
                    overview: "Deadpool é recrutado por uma misteriosa agência para uma missão enquanto Wolverine ainda está descobrindo que a vida sem a Xavier School é mais complicada do que imaginava.",
                    backdropUrl: "https://image.tmdb.org/t/p/original/nDvTTa0G4lLPnYHfqsGYlPDLzWl.jpg",
                    logoUrl: "https://placehold.co/400x120/transparent/white?text=Deadpool",
                    releaseYear: "2024", voteAverage: 7.8, ageRating: "16"
                }
            ]));
            // Removido renderizarItens para movie-row e series-row
        }
    } else if (cat === 'tv') {
        document.querySelector('.home-scroll-area').style.display = 'none';
        document.getElementById('live-tv-screen').style.display = 'flex';
        document.getElementById('vod-tv-screen').style.display = 'none';
        
        const bannerContainer = document.getElementById('dynamic-hero-banner');
        if (bannerContainer) bannerContainer.style.display = 'none';
        const exploreBtn = document.querySelector('.explore-btn-container');
        if (exploreBtn) exploreBtn.style.display = 'none';
        
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
        const exploreBtn = document.querySelector('.explore-btn-container');
        if (exploreBtn) exploreBtn.style.display = 'none';
        
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
    if (items.length === 0) return;
    
    const bannerContainer = document.getElementById('dynamic-hero-banner');
    if (!bannerContainer) return;

    // Gera os slides
    let slidesHtml = '';
    let dotsHtml = '';
    items.forEach((item, i) => {
        const logoImg = item.logoUrl
            ? `<img class="hero-slide-logo" src="${item.logoUrl}" onerror="this.style.display='none'" />`
            : '';
        
        const ratingChip = item.voteAverage
            ? `<span class="hero-meta-chip rating">&#9733; ${parseFloat(item.voteAverage).toFixed(1)}</span>`
            : '';
        const yearChip = item.releaseYear
            ? `<span class="hero-meta-chip">${item.releaseYear}</span>`
            : '';
        const ageChip = item.ageRating
            ? `<span class="hero-meta-chip">${item.ageRating}</span>`
            : '';
        const overviewText = item.overview || '';

        const bgStyle = item.backdropUrl 
            ? `background-image: url('${item.backdropUrl}'), linear-gradient(135deg, #151522 0%, #07070a 100%)`
            : `background-image: linear-gradient(135deg, #151522 0%, #07070a 100%)`;

        slidesHtml += `
            <div class="hero-slide">
                <div class="hero-slide-bg" style="${bgStyle};"></div>
                <div class="hero-slide-gradient"></div>
                <div class="hero-slide-content">
                    ${logoImg}
                    <div class="hero-slide-title">${item.title || ''}</div>
                    <div class="hero-slide-meta">
                        ${ratingChip}${yearChip}${ageChip}
                    </div>
                    <div class="hero-slide-overview">${overviewText}</div>
                </div>
            </div>`;
        dotsHtml += `<div class="hero-dot${i === 0 ? ' active' : ''}" data-index="${i}"></div>`;
    });

    bannerContainer.innerHTML = `
        <div class="hero-carousel-inner" id="hero-carousel-inner">${slidesHtml}</div>
        <button class="hero-arrow hero-arrow-prev" tabindex="0" id="hero-prev">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button class="hero-arrow hero-arrow-next" tabindex="0" id="hero-next">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <div class="hero-dots" id="hero-dots">${dotsHtml}</div>
    `;

    // Lógica do Carrossel
    let currentSlide = 0;
    const totalSlides = items.length;
    const inner = document.getElementById('hero-carousel-inner');
    const dots = document.querySelectorAll('#hero-dots .hero-dot');

    function goToSlide(index) {
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        currentSlide = index;
        inner.style.transform = `translateX(-${currentSlide * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle('active', i === currentSlide));
    }

    document.getElementById('hero-prev').addEventListener('click', (e) => { e.stopPropagation(); goToSlide(currentSlide - 1); });
    document.getElementById('hero-next').addEventListener('click', (e) => { e.stopPropagation(); goToSlide(currentSlide + 1); });
    dots.forEach(dot => dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.index))));

    // Auto-play a cada 6 segundos
    let autoPlay = setInterval(() => goToSlide(currentSlide + 1), 6000);
    bannerContainer.addEventListener('mouseenter', () => clearInterval(autoPlay));
    bannerContainer.addEventListener('mouseleave', () => { autoPlay = setInterval(() => goToSlide(currentSlide + 1), 6000); });

    // Mostrar a seção de últimos adicionados (se existir) - esconde pois usamos o carousel
    const latestSection = document.getElementById('home-latest-section');
    if (latestSection) latestSection.style.display = 'none';
}

// ==========================================
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
            container.firstChild.focus();
            container.firstChild.click();
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
        
        let iconUrl = ch.streamIcon || ch.icon;
        let iconHtml = iconUrl ? `<img src="${iconUrl}" class="channel-logo" onerror="this.style.display='none'">` : '';
        div.innerHTML = `${iconHtml}<span>${ch.name}</span>`;
        
        div.onclick = () => {
            document.querySelectorAll('.live-channel-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            
            document.getElementById('live-player-title').innerText = "Assistindo: " + ch.name;
            // The overlay and loader will be handled by playLiveStream
            
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
        
        const res = await fetch(searchUrl);
        const data = await res.json();
        const result = data.results && data.results.length > 0 ? data.results[0] : null;
        if (!result) return null;
        
        const imagesUrl = `https://api.themoviedb.org/3/${type}/${result.id}/images?api_key=${TMDB_API_KEY}`;
        const imgRes = await fetch(imagesUrl);
        const imgData = await imgRes.json();
        const logo = imgData.logos ? imgData.logos.find(l => l.iso_639_1 === 'pt') || imgData.logos.find(l => l.iso_639_1 === 'en') || imgData.logos[0] : null;
        
        return {
            title: result.title || result.name,
            overview: result.overview,
            backdropUrl: result.backdrop_path ? `https://image.tmdb.org/t/p/original${result.backdrop_path}` : null,
            posterUrl: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null,
            logoUrl: logo && logo.file_path ? `https://image.tmdb.org/t/p/w500${logo.file_path}` : null,
            year: result.release_date ? result.release_date.substring(0,4) : (result.first_air_date ? result.first_air_date.substring(0,4) : null)
        };
    } catch (e) {
        console.error("TMDB Fetch Error", e);
        return null;
    }
}

function openVodModal(item, isSeries) {
    const modal = document.getElementById('vod-details-modal');
    const modalContent = document.getElementById('vod-modal-content');
    const loader = document.getElementById('vod-modal-loader');
    
    // Show modal container and loader, hide content
    modal.style.display = 'flex';
    if (modalContent) modalContent.style.opacity = '0';
    if (loader) loader.style.display = 'block';
    
    // Trigger fade in for the background
    setTimeout(() => modal.classList.add('show'), 10);
    
    const poster = isSeries ? item.cover : item.streamIcon;
    const bgUrl = poster ? `url('${poster}')` : '';
    
    document.getElementById('vod-modal-bg').style.backgroundImage = bgUrl;
    document.getElementById('vod-modal-poster').src = poster || '';
    
    const titleEl = document.getElementById('vod-modal-title');
    const logoEl = document.getElementById('vod-modal-logo');
    titleEl.innerText = item.name;
    titleEl.style.display = 'block';
    if(logoEl) { logoEl.style.display = 'none'; logoEl.src = ''; }
    
    document.getElementById('vod-modal-rating').innerText = `⭐ ${item.rating || "N/A"}`;
    const yearEl = document.getElementById('vod-modal-year');
    if(yearEl) yearEl.innerText = "HD"; 
    
    const synopsisEl = document.getElementById('vod-modal-synopsis');
    if(synopsisEl) synopsisEl.innerText = "Buscando informações...";
    
    fetchTmdbData(item.name, isSeries).then(tmdb => {
        window.currentTmdb = tmdb;
        if (tmdb) {
            if (tmdb.title && titleEl) titleEl.innerText = tmdb.title;
            if (tmdb.overview && synopsisEl) synopsisEl.innerText = tmdb.overview;
            if (tmdb.backdropUrl) document.getElementById('vod-modal-bg').style.backgroundImage = `url('${tmdb.backdropUrl}')`;
            if (tmdb.posterUrl) document.getElementById('vod-modal-poster').src = tmdb.posterUrl;
            if (tmdb.year && yearEl) yearEl.innerText = tmdb.year;
            if (tmdb.logoUrl && logoEl) {
                logoEl.src = tmdb.logoUrl;
                logoEl.style.display = 'block';
                titleEl.style.display = 'none';
            } else {
                titleEl.style.display = 'block';
            }
        } else {
            if(synopsisEl) synopsisEl.innerText = isSeries 
                ? "Temporadas incríveis esperam por você! Prepare a pipoca para assistir " + item.name + "."
                : "Prepare-se para grandes emoções com " + item.name + ". Uma história incrível aguarda você!";
        }
        
        // Hide loader and show content
        if (loader) loader.style.display = 'none';
        if (modalContent) modalContent.style.opacity = '1';
    });

        
    const btnPlay = document.getElementById('vod-btn-play');
    const btnClose = document.getElementById('vod-btn-close');
    btnPlay.onclick = () => {
        closeVodModal();
        let streamUrl = "";
        if (window.AndroidApp) {
            if (window.AndroidApp.getVodStreamUrl) {
                streamUrl = isSeries 
                    ? window.AndroidApp.getSeriesStreamUrl(item.seriesId || item.streamId, item.containerExtension || 'mp4') 
                    : window.AndroidApp.getVodStreamUrl(item.streamId, item.containerExtension || 'mp4');
            } else {
                streamUrl = isSeries ? "" : window.AndroidApp.getStreamUrl(item.streamId);
                if (streamUrl) streamUrl = streamUrl.replace('.ts', '.' + (item.containerExtension || 'mp4'));
            }
        } else {
            streamUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
        }
        
        if (streamUrl) {
            const fsContainer = document.getElementById('fs-player-container');
            const fsPlayer = document.getElementById('fullscreen-player');
            const fsLogo = document.getElementById('fs-logo');
            const fsTitle = document.getElementById('fs-title');
            
            if(fsContainer && fsPlayer) {
                fsContainer.style.display = 'block';
                fsPlayer.src = streamUrl;
                fsPlayer.play();
                fsPlayer.focus();
                
                // Set Logo or Title
                if (window.currentTmdb && window.currentTmdb.logoUrl) {
                    fsLogo.src = window.currentTmdb.logoUrl;
                    fsLogo.style.display = 'block';
                    fsTitle.style.display = 'none';
                } else {
                    fsLogo.style.display = 'none';
                    fsTitle.innerText = item.name;
                    fsTitle.style.display = 'block';
                }

                // Dar foco automático no botão Play para o controle remoto D-PAD funcionar
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
        }
    };
    
    btnClose.onclick = closeVodModal;
    
    // Auto-focus play button
    setTimeout(() => btnPlay.focus(), 100);
}

function closeVodModal() {
    const modal = document.getElementById('vod-details-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
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
            container.firstChild.focus({ preventScroll: true });
            container.firstChild.click();
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
            container.firstChild.focus({ preventScroll: true });
            container.firstChild.click();
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
            
        focusables = focusables.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && 
                   window.getComputedStyle(el).visibility !== 'hidden' && 
                   window.getComputedStyle(el).display !== 'none';
        });
            
        if (focusables.length === 0) return;

        let active = document.activeElement;
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

            if (e.key === 'ArrowUp' && candCenter.y < activeCenter.y) {
                isDirectionMatch = true;
                distPrimary = activeRect.top - candRect.bottom;
                distSecondary = Math.abs(activeCenter.x - candCenter.x);
            } else if (e.key === 'ArrowDown' && candCenter.y > activeCenter.y) {
                isDirectionMatch = true;
                distPrimary = candRect.top - activeRect.bottom;
                distSecondary = Math.abs(activeCenter.x - candCenter.x);
            } else if (e.key === 'ArrowLeft' && candCenter.x < activeCenter.x) {
                isDirectionMatch = true;
                distPrimary = activeRect.left - candRect.right;
                distSecondary = Math.abs(activeCenter.y - candCenter.y);
            } else if (e.key === 'ArrowRight' && candCenter.x > activeCenter.x) {
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
            bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }
});

// =======================================================
// VIRTUAL KEYBOARD LOGIC
// =======================================================
let currentInput = null;
let isShift = false;
let isNumbers = false;

// Open Keyboard when clicking input
document.getElementById('username').addEventListener('click', () => openKeyboard('username'));
document.getElementById('password').addEventListener('click', () => openKeyboard('password'));
// Para suportar navegação via Enter pelo D-PAD no input:
document.getElementById('username').addEventListener('keydown', (e) => { if(e.key === 'Enter') openKeyboard('username'); });
document.getElementById('password').addEventListener('keydown', (e) => { if(e.key === 'Enter') openKeyboard('password'); });

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
    const vkContainer = document.getElementById('virtual-keyboard');
    if (!vkContainer || vkContainer.style.display === 'none') return;
    
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Deixa o WebView nativo da TV fazer a navegação espacial perfeitamente
        // Removido o cálculo manual que causava o "Pulo Duplo" (Double Jump)
    } else if (e.key === 'Escape') {
        if (vkContainer && vkContainer.style.display !== 'none') {
            e.preventDefault();
            e.stopPropagation();
            closeKeyboard();
        } else {
            voltarParaInicio(e);
        }
    } else if (e.key === 'Backspace') {
        if (vkContainer && vkContainer.style.display !== 'none') {
            if (currentInput && currentInput.value.length > 0) {
                currentInput.value = currentInput.value.slice(0, -1);
            } else {
                closeKeyboard();
            }
        } else {
            voltarParaInicio(e);
        }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        // Suporte para Ctrl+V (Colar) no PC
        if (vkContainer && vkContainer.style.display !== 'none' && currentInput && navigator.clipboard) {
            navigator.clipboard.readText().then(text => {
                currentInput.value += text;
            }).catch(err => console.error("Erro ao colar:", err));
        }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Suporte para digitar usando o teclado físico do PC (no emulador) enquanto o teclado virtual está aberto
        if (vkContainer && vkContainer.style.display !== 'none' && currentInput) {
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
    if (savedUser) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('home-screen').style.display = 'block';
        setTimeout(() => {
            mostrarCategoria(document.querySelector('.nav-item.active'), 'inicio');
        }, 100);
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

    // Verifica atualizações ao abrir o app
    setTimeout(() => {
        if (window.AndroidApp && typeof window.AndroidApp.checkForUpdates === 'function') {
            window.AndroidApp.checkForUpdates();
        }
    }, 1000);
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

    const exitPlayer = (e) => {
        if(e) e.stopPropagation();
        if (document.fullscreenElement || document.webkitIsFullScreen) {
            if(document.exitFullscreen) document.exitFullscreen();
            else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
        fsPlayer.pause();
        fsPlayer.src = '';
        fsContainer.style.display = 'none';
    };

    btnBack.addEventListener('click', exitPlayer);

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
            // O exitPlayer é chamado diretamente pelo btnBack; não devemos chamar aqui
            // para evitar conflito com cliques nos botões dentro do player
        }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
}

setupFullscreenPlayer();

// Sincronizar foco do seletor (D-PAD) com o hover do mouse
document.addEventListener('mouseover', (e) => {
    const focusable = e.target.closest('[tabindex="0"], button, input, select, textarea, .nav-item, .live-category-item, .live-channel-item, .tmdb-card, .sk-key');
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

    // 2. Se o modal de detalhes do VOD estiver aberto, fecha ele
    const vodModal = document.getElementById('vod-details-modal');
    if (vodModal && (vodModal.style.display === 'flex' || vodModal.classList.contains('show'))) {
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
let currentApkUrl = "";
let lastFocusedBeforeUpdate = null;

function showUpdateModal(versionName, apkUrl) {
    currentApkUrl = apkUrl;
    lastFocusedBeforeUpdate = document.activeElement;
    
    const modal = document.getElementById('update-confirm-modal');
    const verSpan = document.getElementById('update-version-name');
    if (modal) {
        if (verSpan) verSpan.innerText = versionName;
        
        // Garante que os botões estão visíveis e a barra escondida
        document.getElementById('update-modal-buttons').style.display = 'flex';
        document.getElementById('update-progress-container').style.display = 'none';
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Foca no botão "Atualizar" por padrão
        setTimeout(() => {
            const btnYes = document.getElementById('update-btn-yes');
            if (btnYes) btnYes.focus();
        }, 100);
    }
}

function fecharUpdateModal() {
    const modal = document.getElementById('update-confirm-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            if (lastFocusedBeforeUpdate) {
                lastFocusedBeforeUpdate.focus();
                lastFocusedBeforeUpdate = null;
            }
        }, 300);
    }
}

function iniciarAtualizacao() {
    if (currentApkUrl && window.AndroidApp && typeof window.AndroidApp.downloadAndInstallApk === 'function') {
        // Esconde os botões e mostra a barra de progresso
        document.getElementById('update-modal-buttons').style.display = 'none';
        document.getElementById('update-progress-container').style.display = 'flex';
        
        // Executa o download nativo
        window.AndroidApp.downloadAndInstallApk(currentApkUrl);
    }
}

function updateDownloadProgress(percent) {
    const pText = document.getElementById('update-progress-text');
    const pBar = document.getElementById('update-progress-bar');
    if (pText) pText.innerText = percent + "%";
    if (pBar) pBar.style.width = percent + "%";
}

function onUpdateError(errorMsg) {
    alert("Erro na atualização: " + errorMsg);
    // Restaura os botões caso ocorra falha
    document.getElementById('update-modal-buttons').style.display = 'flex';
    document.getElementById('update-progress-container').style.display = 'none';
    setTimeout(() => {
        const btnYes = document.getElementById('update-btn-yes');
        if (btnYes) btnYes.focus();
    }, 100);
}

