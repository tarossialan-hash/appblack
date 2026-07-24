/* ---------- ESCALA DA TV ----------
   A UI é desenhada em 1280px de largura (#tv-canvas) e escalada até encher a
   largura da tela. A altura do canvas é derivada: altura_real / escala.

   Escalar pelos dois eixos com fatores diferentes encheria a tela, mas
   distorceria — foi o que deixou a imagem espremida na TV de 32". Aqui o fator
   é único (proporção intacta) e quem absorve a diferença de proporção é o
   espaço vertical do canvas, que cresce ou encolhe conforme o painel.

   16:9  -> 1280x720 exato, a medida em que o CSS foi desenhado
   4:3   -> 1280x960, sobra altura (mais fileiras visíveis)
   21:9  -> 1280x540, falta altura (o hero encolhe via min() no CSS) */
const TV_LARGURA = 1280;

function ajustarEscalaTv() {
    if (!document.getElementById('tv-canvas')) return;

    // clientWidth ignora a barra de rolagem; innerWidth é o fallback
    const dispW = document.documentElement.clientWidth || window.innerWidth;
    const dispH = document.documentElement.clientHeight || window.innerHeight;
    if (!dispW || !dispH) return;

    const escala = dispW / TV_LARGURA;
    const raiz = document.documentElement.style;
    raiz.setProperty('--tv-scale', String(escala));
    // Altura em unidades do canvas: ao ser escalada, dá exatamente dispH
    raiz.setProperty('--tv-h', (dispH / escala) + 'px');
}

ajustarEscalaTv();
window.addEventListener('resize', ajustarEscalaTv);
window.addEventListener('orientationchange', ajustarEscalaTv);

/* A cortina "CARREGANDO SUA HOME" que existia aqui foi removida: era
   redundante. O passo de 85% da sincronização já mostra "Organizando sua
   Home..." E, mais importante, é esse passo que chama fetchBannerData() — os
   destaques já estão prontos quando a home aparece, então não havia espera a
   cobrir. Duas cortinas seguidas para o mesmo momento. */

/* ---------- RASCUNHO DO LOGIN ----------
   O app se encerra por completo ao ir para a Home (finishAndRemoveTask, para
   soltar o decodificador de vídeo). Quem estava no meio do login perdia o que
   já tinha digitado e recomeçava do zero.

   Só o usuário é guardado. A senha NÃO: localStorage é texto puro no
   dispositivo, e guardar senha ali seria pior que o incômodo que resolve. A
   senha só é persistida depois do login bem-sucedido, e aí pelo SessionManager,
   que grava criptografado. */
const CHAVE_RASCUNHO_USUARIO = 'rascunho_usuario';

function iniciarRascunhoLogin() {
    const campoUsuario = document.getElementById('username');
    const campoSenha = document.getElementById('password');
    if (!campoUsuario) return;

    const salvo = localStorage.getItem(CHAVE_RASCUNHO_USUARIO) || '';

    // Os campos são assumidos por completo: o que o navegador tiver
    // autopreenchido é descartado. Vale só o nosso rascunho — e a senha nunca
    // vem preenchida, nem do rascunho (ela não é guardada) nem do navegador.
    const assumirCampos = () => {
        campoUsuario.value = salvo;
        if (campoSenha) campoSenha.value = '';
    };
    assumirCampos();

    // O autofill do Chrome roda depois do load, então uma passada só não
    // resolve. A segunda só acontece se o usuário ainda não digitou nada —
    // senão apagaria o que ele acabou de escrever.
    let usuarioDigitou = false;
    const marcarDigitou = () => { usuarioDigitou = true; };
    campoUsuario.addEventListener('input', marcarDigitou);
    if (campoSenha) campoSenha.addEventListener('input', marcarDigitou);
    setTimeout(() => { if (!usuarioDigitou) assumirCampos(); }, 300);

    // 'input' cobre teclado do sistema e do PC; o teclado virtual da TV altera
    // .value por código, que não dispara o evento — por isso ele salva à parte.
    campoUsuario.addEventListener('input', () => {
        localStorage.setItem(CHAVE_RASCUNHO_USUARIO, campoUsuario.value);
    });
}

function salvarRascunhoUsuario() {
    const campoUsuario = document.getElementById('username');
    if (campoUsuario) localStorage.setItem(CHAVE_RASCUNHO_USUARIO, campoUsuario.value);
}

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
    // Entrou: o rascunho cumpriu o papel e não precisa mais existir
    localStorage.removeItem(CHAVE_RASCUNHO_USUARIO);
    // Garante que o teclado virtual não fique aberto ao entrar na home
    const vkEl = document.getElementById('virtual-keyboard');
    if (vkEl) vkEl.style.display = 'none';
    isKeyboardOpen = false;
    currentInput = null;
    if (window.AndroidApp) {
        document.getElementById("sync-screen").style.display = "none";
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("home-screen").style.display = "block";
        const savedCat = localStorage.getItem('current_category') || 'inicio';
        const savedBtn = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick') && el.getAttribute('onclick').includes(`'${savedCat}'`)) || document.querySelector('.nav-item');
        mostrarCategoria(savedBtn, savedCat);
        // Checagem automática, uma vez por sessão — não trava nem atrasa a home.
        verificarAtualizacaoAutomatica();
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

let lastFocusedBeforeLogout = null;
function abrirLogoutModal() {
    const modal = document.getElementById('logout-confirm-modal');
    if (modal) {
        lastFocusedBeforeLogout = document.activeElement;
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        setTimeout(() => {
            const btnNo = document.getElementById('logout-btn-no');
            if (btnNo) btnNo.focus();
        }, 100);
    }
}

function fecharLogoutModal() {
    const modal = document.getElementById('logout-confirm-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            if (lastFocusedBeforeLogout) {
                lastFocusedBeforeLogout.focus();
                lastFocusedBeforeLogout = null;
            }
        }, 300);
    }
}

function confirmarLogout() {
    // Desconecta a sessão nativa (SharedPreferences criptografado) no APK
    try {
        if (window.AndroidApp && typeof window.AndroidApp.logout === 'function') {
            window.AndroidApp.logout();
        }
    } catch (e) {
        console.error('Erro ao desconectar sessão nativa:', e);
    }

    // Limpa todas as credenciais/estado salvos no navegador
    ['logged_in_user', 'wb_user', 'wb_pass', 'wb_url', 'vodDetailItem', 'vodDetailIsSeries']
        .forEach(k => localStorage.removeItem(k));

    // Força recarregamento da WebView para voltar estado zero (idêntico ao F5)
    window.location.reload();
}

function recarregar() {
    let user = localStorage.getItem("wb_user");
    let pass = localStorage.getItem("wb_pass");
    
    // Mostra tela de sincronização e esconde a home
    document.getElementById("sync-screen").style.display = "flex";
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("sync-status-text").innerText = "Sincronizando banco de dados...";
    document.getElementById("sync-progress").style.width = "0%";
    
    if (window.AndroidApp && typeof window.AndroidApp.sync === 'function') {
        window.AndroidApp.sync();
    } else if (window.AndroidApp && user && pass) {
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
    // A busca também sai da TV ao vivo: sem isto o canal seguia tocando por
    // trás da tela de busca, já que este caminho não passa por mostrarCategoria.
    pararPlayerAoVivo();

    // Esconde todas as outras telas do app
    document.querySelector('.home-scroll-area').style.display = 'none';
    document.getElementById('live-tv-screen').style.display = 'none';
    document.getElementById('vod-tv-screen').style.display = 'none';
    const providerScreenAtivo = document.getElementById('provider-screen');
    if (providerScreenAtivo) providerScreenAtivo.style.display = 'none';

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

    // Na TV o foco vai para a primeira tecla do teclado virtual; fora dela,
    // direto para o campo, que é o que faz o teclado do aparelho subir.
    setTimeout(() => {
        if (!USA_TECLADO_VIRTUAL) {
            const campo = document.getElementById('search-input-field');
            if (campo) campo.focus();
            return;
        }
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
    
    // Para tudo do ao vivo ao sair da aba de canais — inclusive a reconexão
    // agendada, que antes ressuscitava o player 1,5s depois da troca de aba.
    if (cat !== 'tv') {
        pararPlayerAoVivo();
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
        document.getElementById('vod-tv-screen').style.display = 'none'; // fix: escondia live mas não vod

        const bannerContainer = document.getElementById('dynamic-hero-banner');
        if (bannerContainer) bannerContainer.style.display = 'block';
        
        if (window.AndroidApp) {
            // Android: só busca se o banner ainda não foi carregado
            if (!window._bannerLoaded) {

                window.AndroidApp.getBannerItems();
                if (typeof window.AndroidApp.getRecentMovies === 'function') {
                    window.AndroidApp.getRecentMovies();
                } else {
                }
                if (typeof window.AndroidApp.getRecentSeries === 'function') {
                    window.AndroidApp.getRecentSeries();
                } else {
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

        // Zera a tela ANTES de pedir as categorias. O carregamento passa pelo
        // Kotlin e volta assíncrono; sem limpar aqui, a aba reaparecia com a
        // última categoria e seus canais ainda montados e, um instante depois,
        // saltava para FAVORITOS quando a resposta chegava. Era esse salto que
        // se via.
        const colCategorias = document.querySelector('.live-col-categories');
        if (colCategorias) colCategorias.innerHTML = '';
        const colCanais = document.querySelector('.live-col-channels');
        if (colCanais) colCanais.innerHTML = '';

        const epgAntigo = document.getElementById('live-epg-list');
        if (epgAntigo) epgAntigo.innerHTML = '';

        // _ativos é declarado mais abaixo no arquivo, mas mostrarCategoria só
        // roda a partir de interação — o script já avaliou por inteiro aqui.
        _ativos.canal = null;
        _ativos.categoriaTv = null;
        _categoriaTvAtual = null;
        
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
    if (!items || items.length === 0) {
        return;
    }

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

    // Só entra no carrossel quem tem informação completa — sinopse, ano e
    // logo. Título sem sinopse (comum quando o TMDB não achou boa
    // correspondência) ficava com o card visivelmente vazio no meio do
    // rodízio; melhor pular do que mostrar incompleto.
    items = items.filter(item => {
        const temSinopse = item.overview && item.overview.trim().length > 10;
        const temAno = !!(item.releaseYear || item.releaseDate);
        const temLogo = !!item.logoUrl;
        return temSinopse && temAno && temLogo;
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
    // Numa TV com Wi-Fi instável o onload/onerror pode simplesmente nunca
    // chegar. Sem prazo, a promessa fica pendente para sempre e o banner
    // permanece preto indefinidamente.
    const TIMEOUT_IMAGEM_MS = 6000;

    function preloadImage(url) {
        return new Promise(resolve => {
            if (!url) { resolve(false); return; }
            const img = new Image();
            let resolvido = false;
            const terminar = (ok) => {
                if (resolvido) return;
                resolvido = true;
                clearTimeout(prazo);
                img.onload = null;
                img.onerror = null;
                resolve(ok);
            };
            const prazo = setTimeout(() => terminar(false), TIMEOUT_IMAGEM_MS);
            img.onload = () => terminar(true);
            img.onerror = () => terminar(false);
            img.src = url;
        });
    }

    async function initWithValidation() {
        const promessas = items.map(async item => {
            const [backdropOk, logoOk] = await Promise.all([
                preloadImage(item.backdropUrl),
                preloadImage(item.logoUrl)
            ]);
            return (backdropOk && logoOk) ? item : null;
        });

        let primeiraRenderizacaoFeita = false;

        // Renderiza IMEDIATAMENTE assim que QUALQUER banner terminar de baixar
        promessas.forEach(p => {
            p.then(result => {
                if (result && !primeiraRenderizacaoFeita) {
                    primeiraRenderizacaoFeita = true;
                    items = [result]; 
                    render(0);
                }
            });
        });

        const resultados = await Promise.all(promessas);
        const validItems = resultados.filter(Boolean).slice(0, 6);

        if (validItems.length === 0) {
            return; 
        }
        
        items = validItems;
        if (primeiraRenderizacaoFeita && items.length > 1) {
            startProgress(); 
        } else if (!primeiraRenderizacaoFeita) {
            render(0);
            startProgress();
        }
    }

    // Ícones de linha (Lucide-style) para a barra de metadados do banner
    const SPOT_ICONS = {
        tipo: '<path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4"/><rect x="3" y="3" width="18" height="18" rx="2"/>',
        data: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
        duracao: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
        pais: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
        genero: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'
    };

    function spotItem(iconKey, texto) {
        if (!texto) return '';
        return `<span class="spotlight-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SPOT_ICONS[iconKey]}</svg>
            <span>${texto}</span>
        </span>`;
    }

    // Formata "2026-06-03" para "03/06/2026"
    function formatarData(d) {
        if (!d) return '';
        const p = String(d).split('-');
        if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
        return d;
    }

    function construirSpotlightMeta(item) {
        const tipo = item.typeLabel || (item.mediaType === 'tv' ? 'Série' : 'Filme');
        const data = formatarData(item.releaseDate) || item.releaseYear || '';
        const nota = item.voteAverage ? parseFloat(item.voteAverage).toFixed(1) : '';

        const notaHtml = nota
            ? `<span class="spotlight-meta-item rating">
                   <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                   <span>${nota}</span>
               </span>` : '';

        return [
            spotItem('tipo', tipo),
            spotItem('data', data),
            spotItem('duracao', item.runtime || ''),
            notaHtml,
            spotItem('pais', item.country || ''),
            spotItem('genero', item.genres || '')
        ].join('');
    }

    function render(index) {
        const item = items[index];
        const backdrop = item.backdropUrl || '';
        const poster   = posterUrl(item);

        const metaHtml = construirSpotlightMeta(item);

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
                    ${titleHtml}
                    <div class="spotlight-meta">${metaHtml}</div>
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
        
        let iconHtml = m.streamIcon ? `<img src="${otimizarCapa(m.streamIcon)}" class="vod-item-poster" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '';
        const movieName = m.name || '';
        const badgeContainer = construirBadges(movieName);
        let cleanTitle = movieName.replace(/\[.*?\]|\(.*?\)|\|.*?\|/g, ' ').replace(/\b(4K|FHD|UHD|1080p|720p|LEG|DUB|DUBLADO|LEGENDADO|CAM|TS|HDTS|TELESYNC)\b/gi, ' ').trim();

        div.innerHTML = `${iconHtml}${badgeContainer}<div class="vod-item-title">${cleanTitle}</div>`;

        div.onclick = () => {
            openVodModal(m, false);
        };

        div.onkeydown = (e) => {
            if (e.key === "Enter") { e.preventDefault(); div.click(); }
        };

        container.appendChild(div);
    });

}

// O provedor entrega capas do TMDB em w500/w600, mas o espaço na grade tem
// ~190px (≈285px reais com a escala da WebView). Pedir w342 corta cerca de
// 3x o trabalho de decodificação por imagem — o que mais pesava ao rolar.
// URLs que não são do TMDB passam intactas.
function otimizarCapa(url) {
    if (!url || url.indexOf('image.tmdb.org') === -1) return url;
    return url.replace(/\/t\/p\/[^/]+\//, '/t/p/w342/');
}

// Gera as tags 4K / LEG / CAM a partir do nome do item
function construirBadges(name) {
    const upperName = name ? name.toUpperCase() : '';
    let badgesHtml = '';
    if (upperName.includes('4K')) badgesHtml += '<div class="badge-4k">4K</div>';
    if (upperName.includes('LEG') || upperName.includes('LEGENDADO')) badgesHtml += '<div class="badge-leg">LEG</div>';
    if (upperName.match(/\b(CAM|TS|HDTS|TELESYNC)\b/)) badgesHtml += '<div class="badge-cam">CAM</div>';
    return badgesHtml ? `<div class="badge-container">${badgesHtml}</div>` : '';
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
        
        let iconHtml = s.cover ? `<img src="${otimizarCapa(s.cover)}" class="vod-item-poster" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '';
        const seriesName = s.name || '';
        const badgeContainer = construirBadges(seriesName);
        let cleanTitle = seriesName.replace(/\[.*?\]|\(.*?\)|\|.*?\|/g, ' ').replace(/\b(4K|FHD|UHD|1080p|720p|LEG|DUB|DUBLADO|LEGENDADO|CAM|TS|HDTS|TELESYNC)\b/gi, ' ').trim();

        div.innerHTML = `${iconHtml}${badgeContainer}<div class="vod-item-title">${cleanTitle}</div>`;

        div.onclick = () => {
            openVodModal(s, true);
        };
        
        div.onkeydown = (e) => {
            if (e.key === "Enter") { e.preventDefault(); div.click(); }
        };
        
        container.appendChild(div);
    });

}

// ==============================================================================
// CALLBACKS DA TV AO VIVO
// ==========================================
// Categoria sintética: não vem do provedor, é montada a partir do que o
// usuário favoritou. Fica sempre no topo da coluna.
const CATEGORIA_FAVORITOS = '__favoritos__';
let _categoriaTvAtual = null;

function onLiveCategoriesLoaded(jsonString) {
    let categories = [];
    try { categories = JSON.parse(jsonString); } catch(e) {}

    // Bloqueio adulto: filtra aqui, onde a categoria aparece pela primeira
    // vez — sem categoria na tela nao ha caminho ate o conteudo.
    categories = filtrarAdulto(categories);

    const container = document.querySelector('.live-col-categories');
    container.innerHTML = "";

    const criarItem = (nome, categoryId) => {
        const div = document.createElement('div');
        div.className = "live-category-item";
        div.tabIndex = 0;
        div.innerText = nome;

        div.onclick = () => {
            marcarAtivo('categoriaTv', div);
            _categoriaTvAtual = categoryId;

            if (categoryId === CATEGORIA_FAVORITOS) {
                if (window.AndroidApp && window.AndroidApp.getFavoriteChannels) {
                    window.AndroidApp.getFavoriteChannels();
                } else {
                    onLiveChannelsLoaded('[]');
                }
                return;
            }

            if (window.AndroidApp) {
                window.AndroidApp.getLiveChannels(categoryId);
            } else {
                onLiveChannelsLoaded(JSON.stringify([{streamId: 101, name: "Canal Mock " + nome, icon: ""}]));
            }
        };

        div.onkeydown = (e) => {
            if (e.key === "Enter") { e.preventDefault(); div.click(); }
        };

        container.appendChild(div);
        return div;
    };

    const itemFavoritos = criarItem('FAVORITOS', CATEGORIA_FAVORITOS);
    itemFavoritos.classList.add('categoria-favoritos');

    categories.forEach(cat => criarItem(cat.categoryName, cat.categoryId));

    // Abre sempre em FAVORITOS. Antes selecionava a primeira do provedor com
    // um setTimeout de 100ms — prazo fixo que numa TV lenta às vezes corria
    // contra a renderização e a tela abria sem nada selecionado. Agora é
    // síncrono: o item acabou de ser inserido, então já existe.
    itemFavoritos.click();
    itemFavoritos.focus();
}

let _ultimaNavegacao = 0; // marca o instante da ultima navegacao por DPAD

// Troca o item ativo sem varrer a lista inteira.
// Com 1200+ canais, o querySelectorAll a cada clique custava caro na TV.
const _ativos = {};
function marcarAtivo(grupo, elemento) {
    const anterior = _ativos[grupo];
    if (anterior && anterior !== elemento) anterior.classList.remove('active');
    if (elemento) elemento.classList.add('active');
    _ativos[grupo] = elemento || null;
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
        let iconHtml = iconUrl ? `<img src="${iconUrl}" class="channel-logo" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '';
        div.innerHTML = `${iconHtml}<span class="channel-name">${ch.name}</span>`;
        
        div.onclick = () => {
            if (div.classList.contains('active')) {
                // Segundo clique no canal já ativo: expande o mini-player, sem recarregar o vídeo
                abrirPlayerTelaCheia();
                return;
            }
            
            // Primeiro clique: abre no mini-player
            marcarAtivo('canal', div);
            
            document.getElementById("live-player-title").innerText = ""; // sem rótulo sobre o vídeo (o elemento segue sendo usado para mensagens de erro)
            
            // Já mostra logo e nome; a programação entra quando o EPG chegar
            mostrarInfoCanal(ch, '');

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
        
        // Marca inicial de favorito (a estrela vem do CSS, via ::after — o
        // conteúdo do item não muda)
        if (window.AndroidApp && window.AndroidApp.isFavorite) {
            try {
                if (window.AndroidApp.isFavorite(ch.streamId, 'live')) {
                    div.classList.add('is-favorito');
                }
            } catch (e) {}
        }

        // ── Favoritar segurando OK (ou clique longo no navegador) ──
        // O toque curto continua abrindo o canal, como sempre foi.
        let timerLongo = null;
        let favoritouSegurando = false;

        const iniciarPressao = () => {
            favoritouSegurando = false;
            clearTimeout(timerLongo);
            // A barra que preenche avisa que segurar faz alguma coisa. Sem ela
            // o gesto era invisível: o usuário segurava, nada reagia por 650ms
            // e ele soltava antes de completar.
            div.classList.add('segurando');
            timerLongo = setTimeout(() => {
                favoritouSegurando = true;
                div.classList.remove('segurando');
                alternarFavoritoCanal(div, ch);
            }, MS_PRESSAO_LONGA);
        };
        const soltarPressao = () => {
            clearTimeout(timerLongo);
            div.classList.remove('segurando');
        };

        div.onkeydown = (e) => {
            if (e.key !== "Enter") return;
            // No Android TV o OK gera um click sintético além deste keydown.
            // Sem o preventDefault o handler roda duas vezes: o 1º aperto
            // ativava o canal e o 2º disparo já abria a tela cheia direto.
            e.preventDefault();
            if (e.repeat) return; // segurando: só o primeiro evento conta
            iniciarPressao();
        };

        div.onkeyup = (e) => {
            if (e.key !== "Enter") return;
            soltarPressao();
            // Como o click sintético foi barrado no keydown, a abertura do
            // canal acontece aqui — a não ser que a pressão longa já tenha
            // favoritado, e aí soltar não deve abrir nada.
            if (!favoritouSegurando) div.click();
        };

        // Mouse/toque (webplayer): mesma pressão longa
        div.onmousedown = iniciarPressao;
        div.onmouseup = soltarPressao;
        div.onmouseleave = soltarPressao;

        container.appendChild(div);
    });

    // Lista vazia precisa dizer o que fazer. Sem isto, abrir em FAVORITOS sem
    // nada salvo mostrava só uma coluna em branco — nem dica, nem aviso.
    if (channels.length === 0) {
        const vazio = document.createElement('div');
        vazio.className = 'lista-vazia';
        vazio.textContent = _categoriaTvAtual === CATEGORIA_FAVORITOS
            ? 'Nenhum canal favoritado ainda.\nSegure OK sobre um canal para favoritar.'
            : 'Nenhum canal nesta categoria.';
        container.appendChild(vazio);
        return;
    }

}

/* ==========================================================
   CONFIGURAÇÕES
   ========================================================== */

const CHAVE_BLOQUEIO_ADULTO = 'bloqueio_adulto';

// Termos que marcam categoria adulta. Comparação sem acento e em minúsculas.
const TERMOS_ADULTO = ['adulto', 'adultos', 'xxx', 'porn', '+18', '18+', 'erotic', 'eroti', 'sexy'];

function bloqueioAdultoLigado() {
    return localStorage.getItem(CHAVE_BLOQUEIO_ADULTO) === '1';
}

/**
 * Remove categorias adultas quando o bloqueio está ligado.
 * Usado nas três listagens (ao vivo, filmes, séries) — é onde a categoria
 * aparece pela primeira vez, então filtrar aqui já impede o acesso ao conteúdo.
 */
function filtrarAdulto(categorias) {
    if (!bloqueioAdultoLigado()) return categorias;
    return categorias.filter(cat => {
        const nome = String(cat.categoryName || '')
            .toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, ''); // tira acentos
        return !TERMOS_ADULTO.some(t => nome.includes(t));
    });
}

/**
 * @param {string} [aba] Aba a abrir já selecionada — "player" (padrão) quando
 * chamado pelo botão de engrenagem, ou outra quando vem de um atalho direto
 * (ex.: o selo "Atualizar App" da top-nav abrindo já em "atualizacao").
 */
function abrirConfiguracoes(aba) {
    const tela = document.getElementById('settings-screen');
    if (!tela) return;

    // Sai de qualquer reprodução: a tela cobre tudo, então deixar áudio
    // tocando por trás seria o mesmo bug que corrigimos na troca de abas.
    pararPlayerAoVivo();

    const nomeAba = aba || 'player';
    tela.style.display = 'block';
    selecionarAbaConfig(nomeAba);
    sincronizarControlesConfig();

    setTimeout(() => {
        // Foca o botão da aba que foi de fato aberta, não sempre o de Player.
        // Sem isto, quem entrava direto em outra aba (ex.: Atualização, pelo
        // selo da top-nav) via o painel certo já ativo, mas o foco do D-pad
        // ficava parado no botão Player — o próximo movimento saía do lugar
        // errado.
        const botaoAba = tela.querySelector(`.cfg-aba[data-aba="${nomeAba}"]`) || tela.querySelector('.cfg-aba');
        if (botaoAba) botaoAba.focus();
    }, 60);
}

function fecharConfiguracoes() {
    const tela = document.getElementById('settings-screen');
    if (!tela) return;
    tela.style.display = 'none';

    // Devolve o foco para a barra superior, de onde a tela foi aberta
    setTimeout(() => {
        const ativo = document.querySelector('.nav-item.active') || document.querySelector('.nav-item');
        if (ativo) ativo.focus();
    }, 60);
}

function configuracoesAbertas() {
    const tela = document.getElementById('settings-screen');
    return !!(tela && tela.style.display !== 'none');
}

function selecionarAbaConfig(nome) {
    const tela = document.getElementById('settings-screen');
    if (!tela) return;

    tela.querySelectorAll('.cfg-aba[data-aba]').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-aba') === nome);
    });
    tela.querySelectorAll('.cfg-painel').forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-painel') === nome);
    });

    // Cada aba busca o que precisa só ao ser aberta
    if (nome === 'informacoes') carregarInfoAssinatura();
    if (nome === 'atualizacao') {
        const el = document.getElementById('cfg-versao-atual');
        if (el) {
            el.textContent = (window.AndroidApp && window.AndroidApp.getAppVersion)
                ? window.AndroidApp.getAppVersion()
                : '—';
        }
    }
}

/** Traz os controles para o estado que está realmente valendo. */
function sincronizarControlesConfig() {
    const formato = (window.AndroidApp && window.AndroidApp.getFormatoLive)
        ? window.AndroidApp.getFormatoLive()
        : (localStorage.getItem('formato_live') || 'ts');

    document.querySelectorAll('.cfg-opcao[data-formato]').forEach(b => {
        b.classList.toggle('selecionada', b.getAttribute('data-formato') === formato);
    });

    const nota = document.getElementById('cfg-nota-formato');
    if (nota) {
        nota.textContent = formato === 'm3u8'
            ? 'HLS costuma reconectar melhor em rede instável. Alguns provedores não o liberam para todos os canais.'
            : 'MPEGTS entra mais rápido e é o formato mais compatível. Padrão do aplicativo.';
    }

    const linha = document.getElementById('cfg-switch-adulto');
    const estado = document.getElementById('cfg-adulto-estado');
    const ligado = bloqueioAdultoLigado();
    if (linha) linha.classList.toggle('ligado', ligado);
    if (estado) estado.textContent = ligado ? 'Ligado' : 'Desligado';

    const linhaDns = document.getElementById('cfg-switch-dns');
    const estadoDns = document.getElementById('cfg-dns-estado');
    const dnsLigado = (window.AndroidApp && window.AndroidApp.getDnsFixEnabled)
        ? window.AndroidApp.getDnsFixEnabled() : false;
    if (linhaDns) linhaDns.classList.toggle('ligado', dnsLigado);
    if (estadoDns) estadoDns.textContent = dnsLigado ? 'Ligado' : 'Desligado';

    const dnsPrimario = (window.AndroidApp && window.AndroidApp.getDnsPrimary)
        ? window.AndroidApp.getDnsPrimary() : '1.1.1.1';
    document.querySelectorAll('.cfg-opcao[data-dns]').forEach(b => {
        b.classList.toggle('selecionada', b.getAttribute('data-dns') === dnsPrimario);
    });
    const notaDns = document.getElementById('cfg-nota-dns');
    if (notaDns) {
        const outro = dnsPrimario === '8.8.8.8' ? '1.1.1.1' : '8.8.8.8';
        notaDns.textContent = `Usado quando a correção de DNS está ligada. Se ${dnsPrimario} não responder, cai para ${outro} automaticamente.`;
    }
}

/**
 * Chamado pelo Kotlin depois de ligar/desligar a VPN de DNS — a permissão de
 * VPN é um diálogo assíncrono do sistema, então o resultado não dá pra saber
 * na hora do clique.
 */
window.onDnsFixResult = function(ligado) {
    sincronizarControlesConfig();
    avisoRapido(ligado ? '✓ Correção de DNS ativada' : 'Correção de DNS desligada');
};

function carregarInfoAssinatura() {
    const grade = document.getElementById('cfg-info-grade');
    if (!grade) return;
    grade.innerHTML = '<div class="cfg-info-vazio">Carregando…</div>';

    if (window.AndroidApp && window.AndroidApp.getUserInfo) {
        window.AndroidApp.getUserInfo();
    } else {
        onUserInfoLoaded(JSON.stringify({ ok: false, erro: 'Indisponível neste modo.' }));
    }
}

/** Chamado pelo Kotlin (e pelo WebBridge no navegador). */
function onUserInfoLoaded(jsonString) {
    const grade = document.getElementById('cfg-info-grade');
    if (!grade) return;

    let dados = {};
    try { dados = JSON.parse(jsonString); } catch (e) {}

    if (!dados || !dados.ok) {
        grade.innerHTML = '<div class="cfg-info-vazio">' +
            (dados && dados.erro ? dados.erro : 'Não foi possível carregar os dados.') + '</div>';
        return;
    }

    const ativo = String(dados.status || '').toLowerCase() === 'active';
    const item = (rotulo, valor, largo, classeValor) =>
        '<div class="cfg-info-item' + (largo ? ' largo' : '') + '">' +
            '<div class="cfg-info-rotulo">' + rotulo + '</div>' +
            '<div class="cfg-info-valor' + (classeValor ? ' ' + classeValor : '') + '">' + (valor || '—') + '</div>' +
        '</div>';

    grade.innerHTML =
        item('Usuário', dados.username) +
        item('Status', dados.status, false, ativo ? 'ok' : '') +
        item('Expiração', dados.expDate) +
        item('Telas Contratadas', dados.maxConnections) +
        item('Formatos Permitidos', dados.allowedFormats, true);
}

/* ---------- VERIFICAÇÃO DE ATUALIZAÇÃO ----------
   Lê version.json na raiz do repo (raw do GitHub) e compara com a versão
   instalada. Só avisa — não baixa nem instala nada. */
const URL_VERSION_JSON = 'https://raw.githubusercontent.com/tarossialan-hash/appblack/main/version.json';

function versaoInstalada() {
    const v = (window.AndroidApp && window.AndroidApp.getAppVersion)
        ? window.AndroidApp.getAppVersion() : '1.0.0';
    // Guarda só os números: "1.0.0 (Web)" -> "1.0.0"
    const m = String(v).match(/\d+(\.\d+)*/);
    return m ? m[0] : '0';
}

/** >0 se a>b, <0 se a<b, 0 se iguais. Compara por segmento numérico. */
function compararVersoes(a, b) {
    const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const d = (pa[i] || 0) - (pb[i] || 0);
        if (d !== 0) return d > 0 ? 1 : -1;
    }
    return 0;
}

// Guarda o link do APK da versão nova, entre verificar e instalar
let _apkUpdateUrl = null;

/** Busca e compara version.json — usado tanto pela checagem manual (Settings)
 *  quanto pela automática (silenciosa, no login). Nunca toca em elementos de
 *  UI: quem chama decide o que fazer com o resultado. */
function buscarInfoAtualizacao() {
    // cache-buster: o raw do GitHub cacheia por alguns minutos
    return fetch(URL_VERSION_JSON + '?t=' + Date.now(), { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(dados => {
            const remota = String(dados.version || '').trim();
            const local = versaoInstalada();
            if (!remota) throw new Error('sem versão');
            return { dados, remota, local, temUpdate: compararVersoes(remota, local) > 0 };
        });
}

function verificarAtualizacao() {
    const status = document.getElementById('cfg-update-status');
    const btn = document.getElementById('cfg-btn-verificar');
    const btnInstalar = document.getElementById('cfg-btn-instalar');
    if (!status) return;

    status.textContent = 'Verificando…';
    if (btn) btn.classList.add('cfg-opcao-ocupada');
    if (btnInstalar) btnInstalar.style.display = 'none';

    const info = document.getElementById('cfg-update-info');
    if (info) info.style.display = 'none';

    buscarInfoAtualizacao()
        .then(({ dados, remota, local, temUpdate }) => {
            if (temUpdate) {
                status.textContent = '';
                preencherCardUpdateInfo(local, remota, dados.notes);
                avisoRapido('Atualização disponível: ' + remota);
                mostrarAcaoUpdate(dados);
                mostrarAvisoUpdateNoMenu(true);
            } else {
                status.textContent = `Você está na versão mais recente (${local}).`;
                mostrarAvisoUpdateNoMenu(false);
            }
        })
        .catch(() => {
            status.textContent = 'Não foi possível verificar agora. Tente novamente.';
        })
        .finally(() => {
            if (btn) btn.classList.remove('cfg-opcao-ocupada');
        });
}

/** Monta o card "o que mudou": versão de/para em destaque + changelog em
 *  lista. As notas do version.json vêm como uma frase só, separada por
 *  vírgula — divide em itens pra não virar um parágrafo corrido. */
function preencherCardUpdateInfo(local, remota, notas) {
    const info = document.getElementById('cfg-update-info');
    const deEl = document.getElementById('cfg-update-de');
    const paraEl = document.getElementById('cfg-update-para');
    const lista = document.getElementById('cfg-update-changelog');
    if (!info) return;

    if (deEl) deEl.textContent = local;
    if (paraEl) paraEl.textContent = remota;

    if (lista) {
        lista.innerHTML = '';
        const itens = (notas || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        if (itens.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Melhorias e correções gerais.';
            lista.appendChild(li);
        } else {
            itens.forEach(texto => {
                const li = document.createElement('li');
                // Primeira letra maiúscula — os itens vêm em minúscula por
                // terem sido cortados no meio da frase original.
                li.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
                lista.appendChild(li);
            });
        }
    }

    info.style.display = 'block';
}

/** Checagem silenciosa, disparada uma vez por sessão logo após o login/sync.
 *  Se achar versão nova, só acende o selo "Atualizar App" na top-nav — sem
 *  interromper o usuário com toast/modal. O clique nele abre a aba de
 *  Configurações já pronta pra instalar. */
function verificarAtualizacaoAutomatica() {
    if (window._updateCheckFeito) return;
    window._updateCheckFeito = true;

    buscarInfoAtualizacao()
        .then(({ dados, temUpdate }) => {
            if (!temUpdate) return;
            _apkUpdateUrl = dados.apkUrl || null;
            mostrarAvisoUpdateNoMenu(true);
        })
        .catch(() => { /* checagem em segundo plano: falha silenciosa, o botão manual continua disponível */ });
}

/** Mostra/esconde o selo de atualização — na top-nav (logado) e na tela de
 *  login (se a checagem rodar antes do usuário entrar). Cada um só existe
 *  na tela em que faz sentido, o outro fica display:none e o toggle é inofensivo. */
function mostrarAvisoUpdateNoMenu(visivel) {
    const navBtn = document.getElementById('nav-update-btn');
    if (navBtn) navBtn.style.display = visivel ? 'flex' : 'none';
    const loginBtn = document.getElementById('login-update-btn');
    if (loginBtn) loginBtn.style.display = visivel ? 'inline-block' : 'none';
}

/** Chamado pelo botão "Atualizar App" da top-nav (e pelo da tela de login,
 *  quando ainda dá pra chegar nela). Não existe modal de confirmação
 *  separado — vai direto pra aba de Configurações que já tem tudo pronto:
 *  status, notas da versão e o botão de baixar/instalar. */
function abrirUpdateConfirmModalDirectly() {
    abrirConfiguracoes('atualizacao');
    verificarAtualizacao();
}

/* Mostra o botão de ação certo para a plataforma:
   - APK: "Baixar e instalar" (baixa o .apk e dispara o instalador)
   - Web: "Atualizar agora" (recarrega — o webplayer sempre serve o código novo) */
function mostrarAcaoUpdate(dados) {
    const btnInstalar = document.getElementById('cfg-btn-instalar');
    const txt = document.getElementById('cfg-btn-instalar-txt');
    if (!btnInstalar) return;

    // Só o APK real tem baixarEInstalarApk. Webplayer (WebBridge) e navegador
    // não têm — para eles, atualizar é recarregar.
    const temInstalador = !!(window.AndroidApp && window.AndroidApp.baixarEInstalarApk);

    if (temInstalador && dados.apkUrl) {
        _apkUpdateUrl = dados.apkUrl;
        if (txt) txt.textContent = 'Baixar e instalar';
        btnInstalar.onclick = iniciarInstalacaoUpdate;
        btnInstalar.style.display = 'flex';
    } else if (!temInstalador) {
        // Web: recarregar traz a versão nova do servidor. location.reload(true)
        // não força mais nada nos navegadores atuais (parâmetro ignorado) — o
        // cache-buster na URL é o que realmente garante buscar os arquivos
        // novos. Também grava a versão remota: sem instalação de verdade pra
        // consultar depois, é assim que "versão instalada" passa a bater com
        // a nova ao reabrir (ver web-bridge.js:getAppVersion).
        const versaoRemota = dados.version;
        btnInstalar.onclick = () => {
            // Mesma chave que o WebBridge já sabia ler (wb_simulated_version) —
            // só faltava alguém escrever nela e o construtor parar de apagar.
            if (versaoRemota) localStorage.setItem('wb_simulated_version', versaoRemota);
            location.href = location.pathname + '?atualizado=' + Date.now();
        };
        if (txt) txt.textContent = 'Atualizar agora';
        btnInstalar.style.display = 'flex';
    }
    // APK sem apkUrl no version.json: fica só o aviso, sem botão
}

function iniciarInstalacaoUpdate() {
    if (!_apkUpdateUrl || !window.AndroidApp || !window.AndroidApp.baixarEInstalarApk) return;
    const status = document.getElementById('cfg-update-status');
    const btnInstalar = document.getElementById('cfg-btn-instalar');
    const prog = document.getElementById('cfg-update-progress');

    if (btnInstalar) btnInstalar.classList.add('cfg-opcao-ocupada');
    if (prog) prog.style.display = 'block';
    if (status) status.textContent = 'Baixando atualização…';
    window.AndroidApp.baixarEInstalarApk(_apkUpdateUrl);
}

// Callbacks chamados pelo Kotlin durante o download do APK
function onUpdateProgress(pct) {
    const fill = document.getElementById('cfg-update-progress-fill');
    const status = document.getElementById('cfg-update-status');
    if (fill) fill.style.width = pct + '%';
    if (status) {
        status.textContent = pct >= 100
            ? 'Download concluído. Abrindo o instalador…'
            : `Baixando atualização… ${pct}%`;
    }
}

function onUpdateError(msg) {
    const status = document.getElementById('cfg-update-status');
    const prog = document.getElementById('cfg-update-progress');
    const btnInstalar = document.getElementById('cfg-btn-instalar');
    if (status) status.textContent = 'Falha ao baixar: ' + (msg || 'erro desconhecido');
    if (prog) prog.style.display = 'none';
    if (btnInstalar) btnInstalar.classList.remove('cfg-opcao-ocupada');
}

function iniciarConfiguracoes() {
    const tela = document.getElementById('settings-screen');
    if (!tela) return;

    const btnVerificar = document.getElementById('cfg-btn-verificar');
    if (btnVerificar) btnVerificar.onclick = verificarAtualizacao;

    tela.querySelectorAll('.cfg-aba[data-aba]').forEach(botao => {
        botao.onclick = () => selecionarAbaConfig(botao.getAttribute('data-aba'));
    });

    tela.querySelectorAll('.cfg-opcao[data-formato]').forEach(botao => {
        botao.onclick = () => {
            const formato = botao.getAttribute('data-formato');
            if (window.AndroidApp && window.AndroidApp.setFormatoLive) {
                window.AndroidApp.setFormatoLive(formato);
            }
            // Guarda também no JS: é a fonte usada quando não há ponte nativa
            localStorage.setItem('formato_live', formato);
            sincronizarControlesConfig();
            avisoRapido(formato === 'm3u8' ? 'Player: HLS (M3U8)' : 'Player: MPEGTS (TS)');
        };
    });

    const linhaAdulto = document.getElementById('cfg-switch-adulto');
    if (linhaAdulto) {
        linhaAdulto.onclick = () => {
            const novo = !bloqueioAdultoLigado();
            localStorage.setItem(CHAVE_BLOQUEIO_ADULTO, novo ? '1' : '0');
            sincronizarControlesConfig();
            avisoRapido(novo ? 'Bloqueio adulto ligado' : 'Bloqueio adulto desligado');
        };
    }

    const linhaDns = document.getElementById('cfg-switch-dns');
    if (linhaDns) {
        linhaDns.onclick = () => {
            if (!window.AndroidApp || !window.AndroidApp.setDnsFixEnabled) return;
            const dnsLigadoAgora = window.AndroidApp.getDnsFixEnabled
                ? window.AndroidApp.getDnsFixEnabled() : false;
            // O estado real do switch só é confirmado por onDnsFixResult (a
            // permissão de VPN é um diálogo assíncrono do Android).
            window.AndroidApp.setDnsFixEnabled(!dnsLigadoAgora);
        };
    }

    tela.querySelectorAll('.cfg-opcao[data-dns]').forEach(botao => {
        botao.onclick = () => {
            const servidor = botao.getAttribute('data-dns');
            if (window.AndroidApp && window.AndroidApp.setDnsPrimary) {
                window.AndroidApp.setDnsPrimary(servidor);
            }
            sincronizarControlesConfig();
            avisoRapido('DNS principal: ' + servidor);
        };
    });

    const btnDeslogar = document.getElementById('cfg-btn-deslogar');
    if (btnDeslogar) btnDeslogar.onclick = () => { fecharConfiguracoes(); abrirLogoutModal(); };

    const btnRetornar = document.getElementById('cfg-btn-retornar');
    if (btnRetornar) btnRetornar.onclick = fecharConfiguracoes;

    // Enter do D-pad: os itens são <button>, mas o preventDefault do handler
    // global barra o clique sintético, então a ativação vem daqui.
    tela.querySelectorAll('.cfg-aba, .cfg-opcao, .cfg-switch-linha').forEach(botao => {
        botao.onkeydown = (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            botao.click();
        };
    });
}

// Quanto tempo segurando OK para favoritar.
// A barra só começa a preencher depois de MS_ATRASO_BARRA: num toque curto
// (abrir o canal) ela nem chega a aparecer, que era o que dava a impressão de
// que um clique simples já ia favoritar.
// Reduzido de 1300 para 700: em vários controles/boxes mais simples o clique
// físico já é curto por natureza, e 1300ms de segurada não dava tempo de
// completar antes do usuário soltar — o cliente segurava e nada acontecia.
const MS_ATRASO_BARRA = 200;
const MS_PRESSAO_LONGA = 700;

// O CSS lê estes mesmos valores — assim o fim da animação coincide com o
// disparo do favorito, em vez de dois números soltos que podem divergir.
document.documentElement.style.setProperty('--atraso-barra', MS_ATRASO_BARRA + 'ms');
document.documentElement.style.setProperty('--dur-barra', (MS_PRESSAO_LONGA - MS_ATRASO_BARRA) + 'ms');

/* ---------- OVERLAY DE INFORMAÇÃO DO CANAL ----------
   Aparece ao abrir o canal com logo, nome e o que está passando, e se apaga
   sozinho. Fica dentro de .live-player-container, que já é position:relative e
   vira tela cheia junto com o player — assim o overlay acompanha os dois
   enquadramentos sem código extra.

   Só opacidade e translateY são animados: são as duas propriedades que a GPU
   compõe sem repintar. Nada de box-shadow ou filter aqui, que numa Smart TV
   custam um repinte por quadro. */
const MS_INFO_CANAL = 5000;
let _canalAtual = null;
let _timerInfoCanal = null;

function elementoInfoCanal() {
    let el = document.getElementById('canal-info-overlay');
    if (el) return el;

    const container = document.querySelector('.live-player-container');
    if (!container) return null;

    el = document.createElement('div');
    el.id = 'canal-info-overlay';
    el.innerHTML =
        '<img class="ci-logo" alt="" onerror="this.style.display=\'none\'">' +
        '<div class="ci-textos">' +
            '<div class="ci-nome"></div>' +
            '<div class="ci-programa"></div>' +
        '</div>';
    container.appendChild(el);
    return el;
}

/**
 * @param {object|null} ch       canal; null mantém o que já está exibido
 * @param {string|undefined} programa  linha da programação; undefined não mexe
 */
function mostrarInfoCanal(ch, programa) {
    const el = elementoInfoCanal();
    if (!el) return;

    if (ch) {
        _canalAtual = ch;
        const logo = el.querySelector('.ci-logo');
        const url = ch.streamIcon || ch.icon || '';
        if (url) {
            logo.src = url;
            logo.style.display = 'block';
        } else {
            logo.removeAttribute('src');
            logo.style.display = 'none';
        }
        el.querySelector('.ci-nome').textContent = ch.name || '';
    }

    if (programa !== undefined) {
        el.querySelector('.ci-programa').textContent = programa || '';
    }

    // Só aparece em tela cheia. No mini-player a faixa cobriria boa parte de
    // uma imagem que já é pequena, e a informação está logo ali na lista.
    // O conteúdo acima é atualizado de qualquer forma, para a faixa já entrar
    // pronta quando o usuário expandir.
    if (!playerEstaEmTelaCheia()) {
        clearTimeout(_timerInfoCanal);
        el.classList.remove('visivel');
        return;
    }

    el.classList.add('visivel');
    clearTimeout(_timerInfoCanal);
    _timerInfoCanal = setTimeout(() => el.classList.remove('visivel'), MS_INFO_CANAL);
}

function esconderInfoCanal() {
    clearTimeout(_timerInfoCanal);
    const el = document.getElementById('canal-info-overlay');
    if (el) el.classList.remove('visivel');
    _canalAtual = null;
}

/**
 * Aviso curto no canto da tela, some sozinho.
 * Criado sob demanda e reaproveitado — o index.html não precisa conhecê-lo.
 */
function avisoRapido(texto) {
    let el = document.getElementById('aviso-rapido');
    if (!el) {
        el = document.createElement('div');
        el.id = 'aviso-rapido';
        (document.getElementById('tv-canvas') || document.body).appendChild(el);
    }
    el.textContent = texto;
    el.classList.add('visivel');
    clearTimeout(avisoRapido._timer);
    avisoRapido._timer = setTimeout(() => el.classList.remove('visivel'), 2200);
}

/**
 * Liga/desliga o canal nos favoritos. Retorna ao chamador nada — o estado novo
 * vem do próprio Kotlin, que é a fonte da verdade.
 */
function alternarFavoritoCanal(div, ch) {
    if (!window.AndroidApp || !window.AndroidApp.addFavorite) return;

    let agoraFavorito = false;
    try {
        agoraFavorito = window.AndroidApp.addFavorite(JSON.stringify({
            id: ch.streamId,
            titulo: ch.name || '',
            posterPath: ch.streamIcon || ch.icon || '',
            tipo: 'live'
        }));
    } catch (e) {
        return;
    }

    div.classList.toggle('is-favorito', !!agoraFavorito);

    // Confirmação explícita: a estrela sozinha é pequena demais para ser notada
    // numa TV a três metros de distância.
    avisoRapido(agoraFavorito ? '★  Canal favoritado' : 'Removido dos favoritos');

    // Pulso na estrela, para o olho ir até ela
    if (agoraFavorito) {
        div.classList.remove('favorito-pulso');
        void div.offsetWidth; // reinicia a animação se favoritar em sequência
        div.classList.add('favorito-pulso');
    }

    // Se o que está aberto é a própria lista de favoritos, desfavoritar tem
    // que tirar o item da tela — senão fica um canal listado que já não é mais
    // favorito.
    if (!agoraFavorito && _categoriaTvAtual === CATEGORIA_FAVORITOS) {
        div.remove();
        const container = document.querySelector('.live-col-channels');
        if (container && !container.querySelector('.live-channel-item')) {
            container.innerHTML = '';
            const vazio = document.createElement('div');
            vazio.className = 'lista-vazia';
            vazio.textContent = 'Nenhum canal favoritado ainda.\nSegure OK sobre um canal para favoritar.';
            container.appendChild(vazio);
        }
    }
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
            backdropUrl:  result.backdrop_path  ? `https://image.tmdb.org/t/p/w1280${result.backdrop_path}` : null,
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

// ==========================================
// Tela de Catálogo por Streaming (Netflix, etc.)
// Prioriza categorias do catálogo Xtream local classificadas pelo nome do
// streaming (ex: uma categoria chamada "NETFLIX" no painel do usuário) — assim
// o que aparece é o que realmente toca. Sem categoria correspondente (ou fora
// do bridge nativo), cai pro TMDB discover filtrado por watch provider.
// ==========================================

const PROVIDER_CATEGORY_ALIASES = {
    8: ['netflix'],
    119: ['prime video', 'amazon prime'],
    350: ['apple tv'],
    283: ['crunchyroll'],
    337: ['disney'],
    307: ['globoplay', 'globo play'],
    1899: ['hbo max', 'hbo'],
    531: ['paramount']
};

function normalizarTexto(s) {
    return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function categoriasCorrespondentes(categorias, aliases) {
    if (!Array.isArray(categorias) || !aliases.length) return [];
    return categorias.filter(c => {
        const nome = normalizarTexto(c.categoryName);
        return aliases.some(a => nome.includes(normalizarTexto(a)));
    });
}

// Intercepta o callback global da bridge (Kotlin ou web-bridge.js) uma única
// vez. As respostas nativas sempre chegam via window.onXxxLoaded — pra
// reaproveitar getVodCategories/getVodList etc. sem essa tela mexer no
// #vod-tv-screen de verdade, troca o callback temporariamente e devolve o
// original assim que a resposta chega (ou depois de um timeout de segurança).
function chamarBridgeUmaVez(metodoBridge, nomeCallback, ...args) {
    return new Promise((resolve) => {
        if (!window.AndroidApp || typeof window.AndroidApp[metodoBridge] !== 'function') {
            resolve([]);
            return;
        }
        const original = window[nomeCallback];
        let resolvido = false;
        const finalizar = (data) => {
            if (resolvido) return;
            resolvido = true;
            window[nomeCallback] = original;
            resolve(data);
        };
        window[nomeCallback] = function (jsonString) {
            let data = [];
            try { data = JSON.parse(jsonString); } catch (e) {}
            finalizar(data);
        };
        setTimeout(() => finalizar([]), 6000);
        try {
            window.AndroidApp[metodoBridge](...args);
        } catch (e) {
            finalizar([]);
        }
    });
}

async function buscarCatalogoLocalPorProvedor(providerId) {
    const aliases = PROVIDER_CATEGORY_ALIASES[providerId] || [];
    if (!aliases.length || !window.AndroidApp) return { movies: [], series: [] };

    const [vodCats, seriesCats] = await Promise.all([
        chamarBridgeUmaVez('getVodCategories', 'onVodCategoriesLoaded'),
        chamarBridgeUmaVez('getSeriesCategories', 'onSeriesCategoriesLoaded')
    ]);

    const vodMatch = categoriasCorrespondentes(vodCats, aliases);
    const seriesMatch = categoriasCorrespondentes(seriesCats, aliases);

    const listasFilmes = await Promise.all(vodMatch.map(c => chamarBridgeUmaVez('getVodList', 'onVodListLoaded', c.categoryId)));
    const listasSeries = await Promise.all(seriesMatch.map(c => chamarBridgeUmaVez('getSeriesList', 'onSeriesListLoaded', c.categoryId)));

    return {
        movies: [].concat(...listasFilmes),
        series: [].concat(...listasSeries)
    };
}

function abrirProviderScreen(providerId, providerName, logoSrc) {
    pararPlayerAoVivo();

    document.querySelector('.home-scroll-area').style.display = 'none';
    document.getElementById('live-tv-screen').style.display = 'none';
    document.getElementById('vod-tv-screen').style.display = 'none';
    const searchScreen = document.getElementById('search-tv-screen');
    if (searchScreen) searchScreen.style.display = 'none';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const topNav = document.querySelector('.top-nav');
    if (topNav) topNav.style.display = 'none';

    const logoEl = document.getElementById('provider-sidebar-logo');
    if (logoEl) { logoEl.src = logoSrc; logoEl.alt = providerName; }

    const screen = document.getElementById('provider-screen');
    if (screen) screen.style.display = 'flex';

    carregarProviderCatalogo(providerId, providerName);
}

function fecharProviderScreen() {
    const screen = document.getElementById('provider-screen');
    if (screen) screen.style.display = 'none';
    const inicioBtn = document.querySelector('.nav-item');
    mostrarCategoria(inicioBtn, 'inicio');
}

let _providerHeroSeq = 0;
let _providerHeroDebounce = null;

// Item já vem do TMDB (discover) — tudo que o hero precisa já está em mãos,
// atualiza na hora, sem round-trip extra.
function atualizarHeroProviderTmdbRaw(tmdbItem) {
    clearTimeout(_providerHeroDebounce);
    _providerHeroSeq++;

    const hero = document.getElementById('provider-hero-backdrop');
    const heroTitle = document.getElementById('provider-hero-title');
    const heroSubtitle = document.getElementById('provider-hero-subtitle');
    const heroMeta = document.getElementById('provider-hero-meta');
    if (!hero) return;

    const backdropPath = tmdbItem.backdrop_path || tmdbItem.poster_path;
    hero.style.backgroundImage = backdropPath ? `url('https://image.tmdb.org/t/p/w1280${backdropPath}')` : '';
    if (heroTitle) heroTitle.textContent = tmdbItem.title || tmdbItem.name || '';
    if (heroSubtitle) heroSubtitle.textContent = tmdbItem.overview ? tmdbItem.overview.slice(0, 170) : '';
    if (heroMeta) {
        const ehSerie = !tmdbItem.title;
        const ano = (tmdbItem.release_date || tmdbItem.first_air_date || '').slice(0, 4);
        const nota = tmdbItem.vote_average ? tmdbItem.vote_average.toFixed(1) : '';
        heroMeta.textContent = [ehSerie ? 'Série' : 'Filme', ano, nota ? '★ ' + nota : ''].filter(Boolean).join('   ');
    }
}

// Item local (catálogo Xtream) só tem pôster — o backdrop/sinopse vêm do
// TMDB. Debounced: trocar de foco rápido no D-pad não pode martelar a API a
// cada passo, só quando o usuário para numa capa por um instante.
function atualizarHeroProviderLocal(item, isSeries) {
    const seq = ++_providerHeroSeq;
    clearTimeout(_providerHeroDebounce);

    const heroTitle = document.getElementById('provider-hero-title');
    if (heroTitle) heroTitle.textContent = item.name || '';

    _providerHeroDebounce = setTimeout(async () => {
        const tmdb = await fetchTmdbData(item.name, isSeries);
        if (seq !== _providerHeroSeq || !tmdb) return; // foco já mudou de novo, ou não achou

        const hero = document.getElementById('provider-hero-backdrop');
        const heroSubtitle = document.getElementById('provider-hero-subtitle');
        const heroMeta = document.getElementById('provider-hero-meta');
        if (hero) hero.style.backgroundImage = tmdb.backdropUrl ? `url('${tmdb.backdropUrl}')` : '';
        if (heroTitle) heroTitle.textContent = tmdb.title || item.name || '';
        if (heroSubtitle) heroSubtitle.textContent = tmdb.overview || '';
        if (heroMeta) {
            const nota = tmdb.voteAverage || item.rating || '';
            heroMeta.textContent = [isSeries ? 'Série' : 'Filme', tmdb.year || '', nota ? '★ ' + nota : ''].filter(Boolean).join('   ');
        }
    }, 280);
}

async function carregarProviderCatalogo(providerId, providerName) {
    const hero = document.getElementById('provider-hero-backdrop');
    const heroTitle = document.getElementById('provider-hero-title');
    const heroSubtitle = document.getElementById('provider-hero-subtitle');
    const heroMeta = document.getElementById('provider-hero-meta');
    const top10Row = document.getElementById('provider-top10-row');
    const seriesRow = document.getElementById('provider-series-row');

    if (hero) hero.style.backgroundImage = '';
    if (heroTitle) heroTitle.textContent = '';
    if (heroSubtitle) heroSubtitle.textContent = '';
    if (heroMeta) heroMeta.textContent = '';
    if (top10Row) top10Row.innerHTML = '<div class="spinner" style="--spinner-size:40px;"></div>';
    if (seriesRow) seriesRow.innerHTML = '';

    let localMovies = [], localSeries = [];
    try {
        const local = await buscarCatalogoLocalPorProvedor(providerId);
        localMovies = local.movies;
        localSeries = local.series;
    } catch (e) {
        console.error('Erro ao buscar catálogo local do provedor', e);
    }

    let tmdbMovies = [], tmdbSeries = [];
    const precisaTmdbFilmes = localMovies.length === 0;
    const precisaTmdbSeries = localSeries.length === 0;

    if (precisaTmdbFilmes || precisaTmdbSeries) {
        try {
            const [moviesRes, seriesRes] = await Promise.all([
                precisaTmdbFilmes
                    ? fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=pt-BR&watch_region=BR&with_watch_providers=${providerId}&sort_by=popularity.desc`)
                    : Promise.resolve(null),
                precisaTmdbSeries
                    ? fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=pt-BR&watch_region=BR&with_watch_providers=${providerId}&sort_by=popularity.desc`)
                    : Promise.resolve(null)
            ]);
            if (moviesRes) {
                const moviesData = await moviesRes.json();
                tmdbMovies = (moviesData.results || []).filter(m => m.poster_path);
            }
            if (seriesRes) {
                const seriesData = await seriesRes.json();
                tmdbSeries = (seriesData.results || []).filter(s => s.poster_path);
            }
        } catch (e) {
            console.error('Erro ao carregar catálogo TMDB do provedor', e);
        }
    }

    // Destaque inicial do hero: item local (enriquecido via TMDB) tem prioridade
    // — é o que realmente toca. Sem local, usa o primeiro resultado do TMDB puro.
    if (localMovies[0] || localSeries[0]) {
        const destaqueLocal = localMovies[0] || localSeries[0];
        atualizarHeroProviderLocal(destaqueLocal, !localMovies[0]);
    } else {
        const destaque = tmdbMovies[0] || tmdbSeries[0];
        if (destaque) atualizarHeroProviderTmdbRaw(destaque);
    }

    if (top10Row) {
        top10Row.innerHTML = '';
        if (localMovies.length) {
            localMovies.slice(0, 8).forEach((m, i) => top10Row.appendChild(montarProviderTopItemLocal(m, i + 1)));
        } else {
            tmdbMovies.slice(0, 8).forEach((m, i) => top10Row.appendChild(montarProviderTopItem(m, i + 1, false)));
        }
    }

    if (seriesRow) {
        seriesRow.innerHTML = '';
        if (localSeries.length) {
            localSeries.slice(0, 12).forEach(s => seriesRow.appendChild(montarProviderPosterLocal(s)));
        } else {
            tmdbSeries.slice(0, 12).forEach(s => seriesRow.appendChild(montarProviderPoster(s, true)));
        }
    }

    if (!localMovies.length && !localSeries.length && !tmdbMovies.length && !tmdbSeries.length) {
        avisoRapido('Não foi possível carregar o catálogo de ' + providerName);
    }
}

function montarProviderTopItem(tmdbItem, rank, isSeries) {
    const wrap = document.createElement('div');
    wrap.className = 'provider-top-item';

    const rankEl = document.createElement('div');
    rankEl.className = 'provider-top-rank';
    rankEl.textContent = String(rank);

    const img = document.createElement('img');
    img.className = 'provider-top-poster';
    img.tabIndex = 0;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = tmdbItem.poster_path ? `https://image.tmdb.org/t/p/w300${tmdbItem.poster_path}` : '';
    img.alt = tmdbItem.title || tmdbItem.name || '';
    img.onclick = () => abrirDetalheProvider(tmdbItem, isSeries);
    img.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); img.click(); } };
    img.onmouseenter = () => atualizarHeroProviderTmdbRaw(tmdbItem);
    img.onfocus = () => atualizarHeroProviderTmdbRaw(tmdbItem);

    wrap.appendChild(rankEl);
    wrap.appendChild(img);
    return wrap;
}

function montarProviderPoster(tmdbItem, isSeries) {
    const div = document.createElement('div');
    div.className = 'vod-item';
    div.tabIndex = 0;
    div.innerHTML = tmdbItem.poster_path
        ? `<img src="https://image.tmdb.org/t/p/w300${tmdbItem.poster_path}" class="vod-item-poster" loading="lazy" decoding="async" onerror="this.style.display='none'">`
        : '';
    const title = document.createElement('div');
    title.className = 'vod-item-title';
    title.textContent = tmdbItem.title || tmdbItem.name || '';
    div.appendChild(title);
    div.onclick = () => abrirDetalheProvider(tmdbItem, isSeries);
    div.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); div.click(); } };
    div.onmouseenter = () => atualizarHeroProviderTmdbRaw(tmdbItem);
    div.onfocus = () => atualizarHeroProviderTmdbRaw(tmdbItem);
    return div;
}

// Variantes "local": item real do catálogo Xtream (streamId/seriesId válido),
// abre o modal de verdade com o botão Assistir funcionando.
function montarProviderTopItemLocal(item, rank) {
    const wrap = document.createElement('div');
    wrap.className = 'provider-top-item';

    const rankEl = document.createElement('div');
    rankEl.className = 'provider-top-rank';
    rankEl.textContent = String(rank);

    const img = document.createElement('img');
    img.className = 'provider-top-poster';
    img.tabIndex = 0;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = item.streamIcon ? otimizarCapa(item.streamIcon) : '';
    img.alt = item.name || '';
    img.onclick = () => openVodModal(item, false);
    img.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); img.click(); } };
    img.onmouseenter = () => atualizarHeroProviderLocal(item, false);
    img.onfocus = () => atualizarHeroProviderLocal(item, false);

    wrap.appendChild(rankEl);
    wrap.appendChild(img);
    return wrap;
}

function montarProviderPosterLocal(item) {
    const div = document.createElement('div');
    div.className = 'vod-item';
    div.tabIndex = 0;
    const iconHtml = item.cover ? `<img src="${otimizarCapa(item.cover)}" class="vod-item-poster" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '';
    div.innerHTML = `${iconHtml}<div class="vod-item-title">${item.name || ''}</div>`;
    div.onclick = () => openVodModal(item, true);
    div.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); div.click(); } };
    div.onmouseenter = () => atualizarHeroProviderLocal(item, true);
    div.onfocus = () => atualizarHeroProviderLocal(item, true);
    return div;
}

function abrirDetalheProvider(tmdbItem, isSeries) {
    const poster = tmdbItem.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbItem.poster_path}` : '';
    openVodModal({
        name: tmdbItem.title || tmdbItem.name || '',
        streamIcon: poster,
        cover: poster,
        rating: tmdbItem.vote_average ? tmdbItem.vote_average.toFixed(1) : ''
    }, isSeries);
}

function playFullscreenVideo(streamUrl, title) {
    const fsContainer = document.getElementById('fs-player-container');
    const fsPlayer    = document.getElementById('fullscreen-player');
    const fsLogo      = document.getElementById('fs-logo');
    const fsTitle     = document.getElementById('fs-title');

    if (fsContainer && fsPlayer) {
        window.isFullscreenLive = false;
        if (typeof updateFullscreenControlsVisibility === 'function') updateFullscreenControlsVisibility();

        // Encerra QUALQUER decodificação em curso antes de abrir a nova.
        // Atribuir src por cima de uma sessão viva deixa as duas disputando o
        // decodificador de hardware — numa TV com um único decodificador 4K é
        // o que produz imagem duplicada e travando.
        pararPlayerAoVivo();
        try {
            fsPlayer.pause();
            fsPlayer.removeAttribute('src');
            fsPlayer.load();
        } catch (e) {}

        // Cobre o player até o primeiro frame de verdade chegar — sem isto
        // o WebView mostrava por um instante o play gigante/fundo branco
        // padrão do <video> nativo antes do stream começar a decodificar.
        const fsLoader = document.getElementById('fs-player-loader');
        if (fsLoader) {
            fsLoader.style.display = 'flex';
            const esconderLoader = () => { fsLoader.style.display = 'none'; };
            fsPlayer.addEventListener('playing', esconderLoader, { once: true });
            fsPlayer.addEventListener('error', esconderLoader, { once: true });
        }

        // Tira o player de dentro de #tv-canvas (transform: scale()) enquanto
        // toca. Um <video> decodificado por hardware precisa recompor sua
        // superfície sempre que algum ancestral tem transform — em stream 4K
        // é exatamente isso que aparecia como imagem partida/duplicada lado a
        // lado, independente do container (.ts ou .mp4). Fora do canvas, o
        // position:fixed volta a valer pra viewport real — por isso troca de
        // var(--tv-w)/var(--tv-h) (unidades do canvas) pra 100vw/100vh.
        const tvCanvas = document.getElementById('tv-canvas');
        if (tvCanvas && fsContainer.parentElement === tvCanvas) {
            document.body.appendChild(fsContainer);
            fsContainer.style.width = '100vw';
            fsContainer.style.height = '100vh';
        }

        fsContainer.style.display = 'block';

        // .ts (MPEG-TS) cru não é demuxado pelo <video> do WebView — só HLS/mp4
        // tocam direto no src. Provedor costuma entregar filme/episódio 4K nesse
        // container (sem remuxar pra mp4), e sem demuxer o decodificador recebe
        // o stream errado e a imagem sai partida/duplicada lado a lado. A TV ao
        // vivo já resolve isso com mpegts.js (playLiveStream); aqui é o mesmo
        // tratamento para VOD (isLive: false).
        if (/\.ts(\?|$)/i.test(streamUrl) && typeof mpegts !== 'undefined' && mpegts.getFeatureList().mseLivePlayback) {
            fsMpegtsPlayer = mpegts.createPlayer(
                { type: 'mpegts', isLive: false, url: streamUrl },
                { enableStashBuffer: true, lazyLoad: false }
            );
            fsMpegtsPlayer.on(mpegts.Events.ERROR, (tipo, detalhe) => {
                console.error('Erro no player de VOD (ts):', tipo, detalhe);
            });
            fsMpegtsPlayer.attachMediaElement(fsPlayer);
            fsMpegtsPlayer.load();
            fsMpegtsPlayer.play().catch(e => console.log('Autoplay bloqueado:', e));
        } else {
            fsPlayer.src = streamUrl;
            fsPlayer.play().catch(e => console.log('Autoplay bloqueado:', e));
        }

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

        // Sem requestFullscreen nativo, de propósito: #fs-player-container já
        // é position:fixed cobrindo a tela inteira só com CSS (ver reparent
        // acima) — o fullscreen nativo não acrescentaria nada visualmente, e
        // ainda obrigaria o WebView a recompor a superfície de vídeo no meio
        // da decodificação.
    }
}

// Resolve a URL de stream de um episódio — mesma lógica usada no card e no
// autoplay, pra nunca divergir entre os dois caminhos.
function resolverStreamUrlEpisodio(ep) {
    const extension = ep.containerExtension || 'mp4';
    if (window.AndroidApp) {
        if (window.AndroidApp.getSeriesStreamUrl) {
            return window.AndroidApp.getSeriesStreamUrl(ep.id, extension);
        }
        return `http://bkpac.cc/series/${window.AndroidApp.getUsername()}/${window.AndroidApp.getPassword()}/${ep.id}.${extension}`;
    }
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
}

// Toca o episódio no índice da lista da temporada atual (window._seriesAutoplayList)
// e marca o card correspondente como ativo — usado tanto pelo clique quanto
// pelo autoplay ao encerrar o episódio anterior.
function tocarEpisodioDaLista(index) {
    const lista = window._seriesAutoplayList;
    if (!lista || !lista[index]) return;

    const ep = lista[index];
    const streamUrl = resolverStreamUrlEpisodio(ep);
    if (!streamUrl) return;

    window._seriesAutoplayIndex = index;
    document.querySelectorAll('#series-detail-episodes-row .episode-card').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });

    playFullscreenVideo(streamUrl, ep.title || `Episódio ${ep.episodeNumber}`);
}

window.onSeriesInfoLoaded = function(jsonString) {
    let data = {};
    try { data = JSON.parse(jsonString); } catch(e) {}

    const tabsContainer = document.getElementById('series-detail-seasons-tabs');
    const episodesContainer = document.getElementById('series-detail-episodes-row');
    const seasonTitleEl = document.getElementById('series-detail-season-title');

    if (!tabsContainer || !episodesContainer) return;
    tabsContainer.innerHTML = '';
    episodesContainer.innerHTML = '';

    // Setas de navegação da fileira: rolam só o carrossel (scrollTo direto no
    // elemento), nunca a página — é isso que evita o "seletor mexendo a tela
    // inteira". Mesmo padrão usado nas fileiras da home.
    const prevBtn = document.getElementById('series-detail-ep-prev');
    const nextBtn = document.getElementById('series-detail-ep-next');
    const scrollEpisodes = (direction) => {
        const amount = episodesContainer.clientWidth * 0.75;
        episodesContainer.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    };
    if (prevBtn) prevBtn.onclick = () => scrollEpisodes('left');
    if (nextBtn) nextBtn.onclick = () => scrollEpisodes('right');

    const episodesMap = data.episodes || {};
    const seasonsKeys = Object.keys(episodesMap).sort((a,b) => parseInt(a) - parseInt(b));

    if (seasonsKeys.length === 0) return;

    function renderSeasonEpisodes(seasonKey) {
        episodesContainer.innerHTML = '';
        if (seasonTitleEl) seasonTitleEl.textContent = `Temporada ${seasonKey}`;

        const episodesList = episodesMap[seasonKey] || [];
        // Autoplay encadeia dentro desta temporada — reaponta a cada troca
        // de aba pra sempre tocar "o próximo desta lista", não da anterior.
        window._seriesAutoplayList = episodesList;
        window._seriesAutoplayIndex = -1;

        episodesList.forEach((ep, epIndex) => {
            const card = document.createElement('div');
            card.className = 'episode-card';
            card.tabIndex = 0;

            const thumbUrl = (ep.info && ep.info.movieImage) ? ep.info.movieImage : (window._vodDetailItem ? (window._vodDetailItem.cover || window._vodDetailItem.streamIcon) : '');
            const imgHtml = thumbUrl ? `<img src="${thumbUrl}" class="episode-card-thumb" onerror="this.src='logo_black.png'">` : `<div style="width:100%;height:100%;background:#111;display:flex;align-items:center;justify-content:center;color:#fff;">BLACK</div>`;

            const badgeHtml = `<div class="episode-card-badge">E${ep.episodeNumber || ep.episode_num || ep.id}</div>`;

            // Nem todo painel Xtream manda duração no episódio — só mostra
            // o selo quando o dado existe de verdade.
            const duracaoMin = ep.info && ep.info.duration ? String(ep.info.duration).match(/\d+/) : null;
            const duracaoHtml = duracaoMin ? `<div class="episode-card-duration">${duracaoMin[0]} min</div>` : '';

            const tituloEpisodio = ep.title || `Episódio ${ep.episodeNumber}`;

            card.innerHTML = `
                <div class="episode-card-thumb-wrap">
                    ${imgHtml}
                    ${badgeHtml}
                    ${duracaoHtml}
                </div>
                <div class="episode-card-title">${tituloEpisodio}</div>
            `;

            card.onclick = () => tocarEpisodioDaLista(epIndex);
            card.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); card.click(); } };
            episodesContainer.appendChild(card);
        });
    }

    seasonsKeys.forEach((key, index) => {
        const tab = document.createElement('button');
        tab.className = 'season-tab';
        tab.tabIndex = 0;
        tab.textContent = `Temporada ${key}`;

        tab.onclick = () => {
            document.querySelectorAll('#series-detail-seasons-tabs .season-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderSeasonEpisodes(key);
        };
        tab.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); tab.click(); } };

        tabsContainer.appendChild(tab);

        if (index === 0) {
            tab.classList.add('active');
            renderSeasonEpisodes(key);
        }
    });
};

function openVodModal(item, isSeries) {
    // Série tem tela própria (layout "página cheia" com herói) — filme
    // continua neste modal centralizado, sem qualquer alteração.
    if (isSeries) {
        abrirSeriesDetailScreen(item);
        return;
    }

    window._lastFocusedVodItem = document.activeElement;
    // topNav permanece visível — o overlay do modal cobre a tela
    window._detailPrevTopNavDisplay = null;

    const screen   = document.getElementById('vod-detail-screen');
    const inner    = document.getElementById('vod-modal-inner');
    const mainLoader = document.getElementById('vod-detail-main-loader');
    const loader   = document.getElementById('vod-detail-loader');
    const backdrop = document.getElementById('vod-detail-backdrop');
    const poster   = document.getElementById('vod-detail-poster');
    const badgesSlot = document.getElementById('vod-detail-badges-slot');
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

    // Reseta a tela e prepara loading
    if (inner) {
        inner.style.transition = 'none';
        inner.style.opacity = '0';
    }
    if (backdrop) {
        backdrop.style.transition = 'none';
        backdrop.style.opacity = '0';
        backdrop.style.backgroundImage = '';
    }
    if (mainLoader) mainLoader.style.display = 'block';
    
    // Instantly preload basic data so it's ready on reveal
    if (poster)   { poster.src = isSeries ? (item.cover || '') : (item.streamIcon || ''); }
    if (badgesSlot) { badgesSlot.innerHTML = construirBadges(item.name); }
    if (titleEl)  { titleEl.textContent = item.name || ''; titleEl.style.display = 'block'; }
    if (logoEl)   { logoEl.style.display = 'none'; logoEl.src = ''; }
    if (origEl)   origEl.textContent = '';
    if (overviewEl) overviewEl.textContent = 'Buscando informações...';
    if (dateEl)   dateEl.innerHTML = '';
    if (genreEl)  genreEl.innerHTML = '';
    if (runtimeEl) runtimeEl.innerHTML = '';
    if (creditsEl) creditsEl.style.display = 'none';
    if (relSection) relSection.style.display = 'none';
    if (relRow)   relRow.innerHTML = '';
    if (seriesSection) seriesSection.style.display = 'none';

    // Exibe o modal como flex (centra o painel interno)
    screen.style.display = 'flex';

    // Botão Voltar Redondo
    const btnBackRound = document.getElementById('vod-detail-screen-back-btn');
    if (btnBackRound) btnBackRound.onclick = closeVodModal;

    // Botão Favoritar
    const btnFav = document.getElementById('vod-detail-btn-fav');
    if (btnFav) {
        const favId = isSeries ? (item.seriesId || item.streamId) : (item.streamId || item.id);
        const favTipo = isSeries ? 'series' : 'movie';
        const marcarFav = (ativo) => {
            btnFav.classList.toggle('is-favorito', !!ativo);
            const label = btnFav.lastChild;
            if (label && label.nodeType === Node.TEXT_NODE) {
                label.textContent = ativo ? ' Favoritado ' : ' Favoritar ';
            }
        };

        if (window.AndroidApp && window.AndroidApp.isFavorite) {
            marcarFav(window.AndroidApp.isFavorite(favId, favTipo));
        }

        btnFav.onclick = () => {
            if (!window.AndroidApp || !window.AndroidApp.addFavorite) return;
            marcarFav(window.AndroidApp.addFavorite(JSON.stringify({
                id: favId,
                titulo: item.name || '',
                posterPath: item.streamIcon || item.cover || '',
                tipo: favTipo
            })));
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
        
        // Finaliza o carregamento suave
        if (mainLoader) mainLoader.style.display = 'none';
        if (inner) {
            inner.style.transition = 'opacity 0.4s ease';
            inner.style.opacity = '1';
        }
        if (loader) loader.style.display = 'none';

        if (tmdb) {
            // Backdrop in background
            if (tmdb.backdropUrl && backdrop) {
                backdrop.style.backgroundImage = `url('${tmdb.backdropUrl}')`;
                backdrop.style.transition = 'opacity 0.8s ease';
                backdrop.style.opacity = '1';
            }
            // Poster oficial na esquerda (sem crop)
            if (poster) {
                poster.src = tmdb.posterUrl || (isSeries ? (item.cover || '') : (item.streamIcon || ''));
            }
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
            
            // Metadata: renderização exata conforme Anexo 2
            let metaHtml = '';
            if (tmdb.releaseDate) {
                metaHtml += `<span style="display:flex;align-items:center;gap:6px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${tmdb.releaseDate}</span>`;
            }
            if (tmdb.genres && tmdb.genres.length) {
                metaHtml += `<span style="display:flex;align-items:center;gap:6px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg> ${tmdb.genres.slice(0,3).join(', ')}</span>`;
            }
            if (!isSeries && tmdb.runtime) {
                const h = Math.floor(tmdb.runtime / 60), m = tmdb.runtime % 60;
                const hh = h.toString().padStart(2, '0');
                const mm = m.toString().padStart(2, '0');
                metaHtml += `<span style="display:flex;align-items:center;gap:6px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${hh}:${mm}h</span>`;
            }
            if (tmdb.voteAverage || isSeries) {
                const rating = tmdb.voteAverage ? String(tmdb.voteAverage).replace('.0','') : '7';
                metaHtml += `<span style="display:flex;align-items:center;gap:6px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${rating}</span>`;
            }
            
            const metaContainer = document.getElementById('vod-detail-meta');
            if (metaContainer) metaContainer.innerHTML = metaHtml;

            // Créditos
            const hasDir = tmdb.director && tmdb.director.length;
            const hasCast = tmdb.cast && tmdb.cast.length;
            if ((hasDir || hasCast) && creditsEl) {
                creditsEl.style.display = 'flex';
                if (hasDir && directorEl) {
                    directorEl.style.display = 'flex';
                    const span = directorEl.querySelector('.content');
                    if(span) span.innerHTML = `<span style="color:rgba(255,255,255,0.6)">Direção:</span> ${tmdb.director.join(', ')}`;
                } else if(directorEl) {
                    directorEl.style.display = 'none';
                }
                
                if (hasCast && castEl) {
                    castEl.style.display = 'flex';
                    const span = castEl.querySelector('.content');
                    if(span) span.innerHTML = `<span style="color:rgba(255,255,255,0.6)">Elenco:</span> ${tmdb.cast.slice(0,10).join(', ')}`;
                } else if(castEl) {
                    castEl.style.display = 'none';
                }
            } else if(creditsEl) {
                creditsEl.style.display = 'none';
            }
        } else {
            if (titleEl) titleEl.style.display = 'block';
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
                                ? `<img src="${otimizarCapa(m.streamIcon)}" class="vod-item-poster" loading="lazy" decoding="async" onerror="this.style.display='none'">`
                                : '';

                            let cleanTitle = (m.name || '')
                                .replace(/\[.*?\]|\(.*?\)|\|.*?\|/g, ' ')
                                .replace(/\b(4K|FHD|UHD|1080p|720p|LEG|DUB|DUBLADO|LEGENDADO|CAM|TS|HDTS|TELESYNC)\b/gi, ' ')
                                .trim();

                            card.innerHTML = `${iconHtml}<div class="vod-item-title">${cleanTitle}</div>`;
                            card.onclick = () => openVodModal(m, isSeries);
                            card.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); card.click(); } };
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

    // Limpa estado
    localStorage.removeItem('vodDetailItem');
    localStorage.removeItem('vodDetailIsSeries');

    // Devolve foco ao card que abriu
    if (window._lastFocusedVodItem && typeof window._lastFocusedVodItem.focus === 'function') {
        setTimeout(() => { window._lastFocusedVodItem.focus(); }, 50);
    }
}

// ==========================================
// Tela de Detalhes de Série — página cheia com herói (backdrop grande),
// separada do modal de filme (#vod-detail-screen) de propósito: são fluxos
// visuais diferentes e mexer num não pode voltar a afetar o outro.
// ==========================================

function abrirSeriesDetailScreen(item) {
    window._lastFocusedVodItem = document.activeElement;

    // Proteção: se o navegador ainda estiver em fullscreen nativo de um
    // episódio anterior (às vezes o Escape não dispara o exit a tempo), a
    // tela ficava renderizada só dentro da caixa antiga do fullscreen,
    // cortada. Força sair antes de desenhar.
    if (document.fullscreenElement || document.webkitIsFullScreen) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }

    const screen      = document.getElementById('series-detail-screen');
    const inner       = document.getElementById('series-modal-inner');
    const mainLoader  = document.getElementById('series-detail-main-loader');
    const loader      = document.getElementById('series-detail-loader');
    const backdrop    = document.getElementById('series-detail-backdrop');
    const poster      = document.getElementById('series-detail-poster');
    const logoEl      = document.getElementById('series-detail-logo');
    const titleEl     = document.getElementById('series-detail-title');
    const origEl      = document.getElementById('series-detail-original');
    const overviewEl  = document.getElementById('series-detail-overview');
    const metaEl      = document.getElementById('series-detail-meta');
    const creditsEl   = document.getElementById('series-detail-credits');
    const directorEl  = document.getElementById('series-detail-director');
    const castEl      = document.getElementById('series-detail-cast');

    window._vodDetailItem   = item;
    window._vodDetailSeries = true;
    window.currentTmdb      = null;

    localStorage.setItem('vodDetailItem', JSON.stringify(item));
    localStorage.setItem('vodDetailIsSeries', '1');

    if (inner) { inner.style.transition = 'none'; inner.style.opacity = '0'; }
    if (backdrop) { backdrop.style.transition = 'none'; backdrop.style.opacity = '0'; backdrop.style.backgroundImage = ''; }
    if (mainLoader) mainLoader.style.display = 'block';

    if (poster)  poster.src = item.cover || '';
    if (titleEl) { titleEl.textContent = item.name || ''; titleEl.style.display = 'block'; }
    if (logoEl)  { logoEl.style.display = 'none'; logoEl.src = ''; }
    if (origEl)  origEl.textContent = '';
    if (overviewEl) overviewEl.textContent = 'Buscando informações...';
    if (metaEl) metaEl.innerHTML = '';
    if (creditsEl) creditsEl.style.display = 'none';

    const seasonsTabs = document.getElementById('series-detail-seasons-tabs');
    const episodesRow = document.getElementById('series-detail-episodes-row');
    if (seasonsTabs) seasonsTabs.innerHTML = '';
    if (episodesRow) episodesRow.innerHTML = '<div class="spinner" style="--spinner-size:36px;"></div>';

    if (screen) screen.style.display = 'flex';

    const btnBack = document.getElementById('series-detail-back-btn');
    if (btnBack) btnBack.onclick = fecharSeriesDetailScreen;

    // Botão Favoritar
    const btnFav = document.getElementById('series-detail-btn-fav');
    if (btnFav) {
        const favId = item.seriesId || item.streamId;
        const marcarFav = (ativo) => {
            btnFav.classList.toggle('is-favorito', !!ativo);
            // Removido texto para ficar apenas o ícone, conforme anexo 2
        };
        if (window.AndroidApp && window.AndroidApp.isFavorite) {
            marcarFav(window.AndroidApp.isFavorite(favId, 'series'));
        }
        btnFav.onclick = () => {
            if (!window.AndroidApp || !window.AndroidApp.addFavorite) return;
            marcarFav(window.AndroidApp.addFavorite(JSON.stringify({
                id: favId,
                titulo: item.name || '',
                posterPath: item.cover || '',
                tipo: 'series'
            })));
        };
    }

    // Botão Assistir — toca o primeiro episódio da primeira temporada assim
    // que a lista carregar (guardado em window._seriesAutoplayList).
    const btnPlay = document.getElementById('series-detail-btn-play');
    if (btnPlay) {
        btnPlay.onclick = () => {
            const lista = window._seriesAutoplayList;
            if (lista && lista.length) {
                tocarEpisodioDaLista(0);
            }
        };
        setTimeout(() => btnPlay.focus(), 150);
    }

    // Botão Minha Lista — o app não tem esse conceito no backend nativo
    // (só favoritos), então guarda localmente por enquanto.
    const btnList = document.getElementById('series-detail-btn-list');
    if (btnList) {
        const listId = item.seriesId || item.streamId;
        const lerMinhaLista = () => { try { return JSON.parse(localStorage.getItem('sh-minha-lista') || '[]'); } catch (e) { return []; } };
        const marcarLista = (ativo) => {
            btnList.classList.toggle('is-favorito', !!ativo);
            const label = btnList.lastChild;
            if (label && label.nodeType === Node.TEXT_NODE) {
                label.textContent = ativo ? ' Na Minha Lista ' : ' Minha Lista ';
            }
        };
        marcarLista(lerMinhaLista().includes(listId));
        btnList.onclick = () => {
            const lista = lerMinhaLista();
            const idx = lista.indexOf(listId);
            const agoraNaLista = idx === -1;
            if (agoraNaLista) lista.push(listId); else lista.splice(idx, 1);
            localStorage.setItem('sh-minha-lista', JSON.stringify(lista));
            marcarLista(agoraNaLista);
            avisoRapido(agoraNaLista ? 'Adicionado à Minha Lista' : 'Removido da Minha Lista');
        };
    }

    // "Ver mais" — só aparece quando a sinopse realmente estoura 2 linhas.
    // Toggle "Ver mais/menos" removido a pedido do usuário
    const overviewToggle = document.getElementById('series-detail-overview-toggle');
    if (overviewToggle) overviewToggle.style.display = 'none';

    fetchTmdbData(item.name, true).then(tmdb => {
        window.currentTmdb = tmdb;

        if (mainLoader) mainLoader.style.display = 'none';
        if (inner) { inner.style.transition = 'opacity 0.4s ease'; inner.style.opacity = '1'; }
        if (loader) loader.style.display = 'none';

        if (tmdb) {
            if (tmdb.backdropUrl && backdrop) {
                backdrop.style.backgroundImage = `url('${tmdb.backdropUrl}')`;
                backdrop.style.transition = 'opacity 0.8s ease';
                backdrop.style.opacity = '1';
            }
            if (poster) poster.src = tmdb.posterUrl || item.cover || '';
            if (tmdb.logoUrl && logoEl) {
                logoEl.src = tmdb.logoUrl;
                logoEl.style.display = 'block';
                if (titleEl) titleEl.style.display = 'none';
            } else if (titleEl) {
                titleEl.textContent = tmdb.title || item.name || '';
                titleEl.style.display = 'block';
            }
            if (origEl && tmdb.originalTitle && tmdb.originalTitle !== (tmdb.title || item.name)) {
                origEl.textContent = tmdb.originalTitle;
            }
            if (overviewEl) {
                overviewEl.classList.remove('expanded');
                overviewEl.textContent = tmdb.overview || '';
                const toggle = document.getElementById('series-detail-overview-toggle');
                if (toggle) toggle.style.display = 'none';
            }

            let metaHtml = '';
            if (tmdb.releaseDate) {
                metaHtml += `<span style="display:flex;align-items:center;gap:6px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${tmdb.releaseDate}</span>`;
            }
            if (tmdb.genres && tmdb.genres.length) {
                metaHtml += `<span style="display:flex;align-items:center;gap:6px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg> ${tmdb.genres.slice(0,3).join(', ')}</span>`;
            }
            const rating = tmdb.voteAverage ? String(tmdb.voteAverage).replace('.0','') : (item.rating || '');
            if (rating) {
                metaHtml += `<span style="display:flex;align-items:center;gap:6px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${rating}</span>`;
            }
            if (metaEl) metaEl.innerHTML = metaHtml;

            const hasDir = tmdb.director && tmdb.director.length;
            const hasCast = tmdb.cast && tmdb.cast.length;
            if ((hasDir || hasCast) && creditsEl) {
                creditsEl.style.display = 'flex';
                if (hasDir && directorEl) {
                    directorEl.style.display = 'flex';
                    const span = directorEl.querySelector('.content');
                    if (span) span.innerHTML = `<span style="color:rgba(255,255,255,0.6)">Direção:</span> ${tmdb.director.join(', ')}`;
                } else if (directorEl) {
                    directorEl.style.display = 'none';
                }
                if (hasCast && castEl) {
                    castEl.style.display = 'flex';
                    const span = castEl.querySelector('.content');
                    if (span) span.innerHTML = `<span style="color:rgba(255,255,255,0.6)">Elenco:</span> ${tmdb.cast.slice(0,10).join(', ')}`;
                } else if (castEl) {
                    castEl.style.display = 'none';
                }
            } else if (creditsEl) {
                creditsEl.style.display = 'none';
            }
        } else {
            if (titleEl) titleEl.style.display = 'block';
            if (overviewEl) {
                overviewEl.classList.remove('expanded');
                overviewEl.textContent = 'Temporadas incríveis esperam por você com ' + item.name + '.';
            }
            const toggle = document.getElementById('series-detail-overview-toggle');
            if (toggle) toggle.style.display = 'none';
        }

        if (window.AndroidApp && window.AndroidApp.getSeriesInfo) {
            window.AndroidApp.getSeriesInfo(item.seriesId || item.streamId);
        } else if (window.WebBridge && window.WebBridge.getSeriesInfo) {
            window.WebBridge.getSeriesInfo(item.seriesId || item.streamId);
        }
    });
}

function fecharSeriesDetailScreen() {
    const screen = document.getElementById('series-detail-screen');
    if (screen) screen.style.display = 'none';

    localStorage.removeItem('vodDetailItem');
    localStorage.removeItem('vodDetailIsSeries');
    window._seriesAutoplayList = null;

    if (window._lastFocusedVodItem && typeof window._lastFocusedVodItem.focus === 'function') {
        setTimeout(() => { window._lastFocusedVodItem.focus(); }, 50);
    }
}

function onVodCategoriesLoaded(jsonString) {
    let categories = [];
    try { categories = JSON.parse(jsonString); } catch(e) {}

    // Bloqueio adulto: filtra aqui, onde a categoria aparece pela primeira
    // vez — sem categoria na tela nao ha caminho ate o conteudo.
    categories = filtrarAdulto(categories);
    
    const container = document.getElementById('vod-categories-list');
    container.innerHTML = '';
    
    
    // Cache global para categorias VOD
    if (!window._vodCache) window._vodCache = {};
    window._currentVodType = 'vod';

    const itemFavoritosVod = document.createElement('div');
    itemFavoritosVod.className = 'live-category-item categoria-favoritos';
    itemFavoritosVod.tabIndex = 0;
    itemFavoritosVod.innerText = 'FAVORITOS';
    itemFavoritosVod.onclick = () => {
        document.querySelectorAll('#vod-categories-list .live-category-item, #vod-categories-list .favorites-category-item').forEach(el => el.classList.remove('active'));
        itemFavoritosVod.classList.add('active');
        const grid = document.getElementById('vod-items-grid');
        grid.innerHTML = '<div style="grid-column: 1 / -1; display:flex; justify-content:center; align-items:center; min-height:300px;"><div class="spinner" style="--spinner-size:46px;"></div></div>';
        if (window.AndroidApp && window.AndroidApp.getFavoriteMovies) {
            window.AndroidApp.getFavoriteMovies();
        } else {
            onVodListLoaded('[]', true);
        }
    };
    itemFavoritosVod.onkeydown = (e) => {
        if (e.key === "Enter") { e.preventDefault(); itemFavoritosVod.click(); }
    };
    container.appendChild(itemFavoritosVod);

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
                grid.innerHTML = '<div style="grid-column: 1 / -1; display:flex; justify-content:center; align-items:center; min-height:300px;"><div class="spinner" style="--spinner-size:46px;"></div></div>';
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
            if (e.key === "Enter") { e.preventDefault(); div.click(); }
        };
        
        container.appendChild(div);
    });
    
    if (categories.length > 0) {
        setTimeout(() => {
            const firstCat = container.querySelector('.live-category-item:not(.categoria-favoritos)');
            if (firstCat) {
                firstCat.focus({ preventScroll: true });
                firstCat.click();
            }
        }, 50);
    }
}

// ==========================================
// GRADE INCREMENTAL (Filmes e Séries)
// Uma categoria pode ter 5.000+ títulos. Criar tudo de uma vez trava a TV,
// então montamos em blocos conforme a rolagem se aproxima do fim.
// A estrutura do DOM é idêntica — muda só QUANDO cada item é criado.
// ==========================================
// 40 por bloco: enche a tela com folga sem criar um pico de decodificação
const TAMANHO_BLOCO = 40;
let _gradeObserver = null;

function renderizarGradeIncremental(container, itens, montarItem) {
    // Encerra o carregamento da grade anterior
    if (_gradeObserver) {
        _gradeObserver.disconnect();
        _gradeObserver = null;
    }
    container.innerHTML = '';
    if (!itens.length) return;

    let proximo = 0;

    const desenharBloco = () => {
        const fim = Math.min(proximo + TAMANHO_BLOCO, itens.length);
        // Fragmento: um único encaixe no DOM em vez de um por item
        const frag = document.createDocumentFragment();
        for (let i = proximo; i < fim; i++) frag.appendChild(montarItem(itens[i]));
        container.insertBefore(frag, sentinela);
        proximo = fim;

        if (proximo >= itens.length) {
            _gradeObserver.disconnect();
            sentinela.remove();
        }
    };

    // Marcador invisível no fim da grade: ao se aproximar, carrega o próximo bloco
    const sentinela = document.createElement('div');
    sentinela.style.cssText = 'grid-column:1/-1;height:1px;';
    container.appendChild(sentinela);

    _gradeObserver = new IntersectionObserver((entradas) => {
        if (entradas.some(e => e.isIntersecting)) desenharBloco();
    }, { root: container, rootMargin: '600px' });

    desenharBloco();              // primeiro bloco imediato
    _gradeObserver.observe(sentinela);
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

    renderizarGradeIncremental(container, movies, (m) => {
        const div = document.createElement('div');
        div.className = 'vod-item';
        div.tabIndex = 0;

        let iconHtml = m.streamIcon ? `<img src="${otimizarCapa(m.streamIcon)}" class="vod-item-poster" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '';
        const badgeContainer = construirBadges(m.name);

        const movieName = m.name || '';
        let cleanGridTitle = movieName.replace(/\[.*?\]|\(.*?\)|\|.*?\|/g, ' ').replace(/\b(4K|FHD|UHD|1080p|720p|LEG|DUB|DUBLADO|LEGENDADO|CAM|TS|HDTS|TELESYNC)\b/gi, ' ').trim();

        div.innerHTML = `${iconHtml}${badgeContainer}<div class="vod-item-title">${cleanGridTitle}</div>`;

        div.onclick = () => {
            openVodModal(m, false);
        };

        div.onkeydown = (e) => {
            if (e.key === "Enter") { e.preventDefault(); div.click(); }
        };

        return div;
    });
}

function onSeriesCategoriesLoaded(jsonString) {
    let categories = [];
    try { categories = JSON.parse(jsonString); } catch(e) {}

    // Bloqueio adulto: filtra aqui, onde a categoria aparece pela primeira
    // vez — sem categoria na tela nao ha caminho ate o conteudo.
    categories = filtrarAdulto(categories);
    
    const container = document.getElementById('vod-categories-list');
    container.innerHTML = '';
    
    
    // Cache global para categorias de Séries
    if (!window._seriesCache) window._seriesCache = {};
    window._currentVodType = 'series';

    const itemFavoritosSeries = document.createElement('div');
    itemFavoritosSeries.className = 'live-category-item categoria-favoritos';
    itemFavoritosSeries.tabIndex = 0;
    itemFavoritosSeries.innerText = 'FAVORITOS';
    itemFavoritosSeries.onclick = () => {
        document.querySelectorAll('#vod-categories-list .live-category-item, #vod-categories-list .favorites-category-item').forEach(el => el.classList.remove('active'));
        itemFavoritosSeries.classList.add('active');
        const grid = document.getElementById('vod-items-grid');
        grid.innerHTML = '<div style="grid-column: 1 / -1; display:flex; justify-content:center; align-items:center; min-height:300px;"><div class="spinner" style="--spinner-size:46px;"></div></div>';
        if (window.AndroidApp && window.AndroidApp.getFavoriteSeries) {
            window.AndroidApp.getFavoriteSeries();
        } else {
            onSeriesListLoaded('[]', true);
        }
    };
    itemFavoritosSeries.onkeydown = (e) => {
        if (e.key === "Enter") { e.preventDefault(); itemFavoritosSeries.click(); }
    };
    container.appendChild(itemFavoritosSeries);

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
                grid.innerHTML = '<div style="grid-column: 1 / -1; display:flex; justify-content:center; align-items:center; min-height:300px;"><div class="spinner" style="--spinner-size:46px;"></div></div>';
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
            if (e.key === "Enter") { e.preventDefault(); div.click(); }
        };
        
        container.appendChild(div);
    });
    
    if (categories.length > 0) {
        setTimeout(() => {
            const firstCat = container.querySelector('.live-category-item:not(.categoria-favoritos)');
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

    renderizarGradeIncremental(container, series, (s) => {
        const div = document.createElement('div');
        div.className = 'vod-item';
        div.tabIndex = 0;

        let iconHtml = s.cover ? `<img src="${otimizarCapa(s.cover)}" class="vod-item-poster" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '';
        const badgeContainer = construirBadges(s.name);

        const seriesName = s.name || '';
        let cleanGridTitle = seriesName.replace(/\[.*?\]|\(.*?\)|\|.*?\|/g, ' ').replace(/\b(4K|FHD|UHD|1080p|720p|LEG|DUB|DUBLADO|LEGENDADO|CAM|TS|HDTS|TELESYNC)\b/gi, ' ').trim();

        div.innerHTML = `${iconHtml}${badgeContainer}<div class="vod-item-title">${cleanGridTitle}</div>`;

        div.onclick = () => {
            openVodModal(s, true);
        };

        div.onkeydown = (e) => {
            if (e.key === "Enter") { e.preventDefault(); div.click(); }
        };

        return div;
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
    
    epg.forEach((prog, index) => {
        const div = document.createElement('div');
        div.className = "epg-item";
        
        let title = prog.title;
        try { title = decodeURIComponent(escape(window.atob(prog.title))); } catch(e) {}
        
        // Cada provedor Xtream manda o horário num formato. Já vimos o mesmo
        // programa vir com start em texto ("2026-07-22 15:20:00") e end em
        // epoch (1784751000). A versão anterior devolvia o valor CRU quando não
        // reconhecia o formato — era daí que saía o número na tela.
        const doisDigitos = (n) => String(n).padStart(2, '0');
        const horaDeData = (d) => isNaN(d) ? '' : doisDigitos(d.getHours()) + ':' + doisDigitos(d.getMinutes());

        const horaDe = (v) => {
            if (v === null || v === undefined) return '';
            const s = String(v).trim();
            if (!s) return '';

            // "AAAA-MM-DD HH:MM:SS": já vem no fuso do servidor, usa direto.
            // O padrão é conferido por inteiro — testar só por espaço fazia
            // qualquer texto solto virar "hora".
            const comData = s.match(/^\d{4}-\d{2}-\d{2} (\d{2}:\d{2})/);
            if (comData) return comData[1];

            // ISO 8601
            if (s.includes('T')) return horaDeData(new Date(s));

            // Epoch puro: 10 dígitos são segundos, 13 são milissegundos
            if (/^\d{9,14}$/.test(s)) {
                const n = Number(s);
                return horaDeData(new Date(s.length > 11 ? n : n * 1000));
            }

            // Já veio como "HH:MM"
            if (/^\d{1,2}:\d{2}/.test(s)) return s.substring(0, 5);

            // Formato desconhecido: melhor não mostrar nada do que mostrar lixo
            return '';
        };

        const startTime = horaDe(prog.start || prog.startTimestamp);
        const endTime = horaDe(prog.end || prog.stop || prog.endTimestamp || prog.end_timestamp);

        // Guarda os horários brutos: a faixa da tela cheia usa para calcular o progresso
        div.dataset.start = prog.start || '';
        div.dataset.end = prog.end || prog.stop || '';

        div.innerHTML = `
            <div class="epg-time">${startTime}${endTime ? ' - ' + endTime : ''}</div>
            <div class="epg-program-title">${title}</div>
        `;
        container.appendChild(div);

        // O primeiro item é o que está no ar: alimenta o overlay do player
        if (index === 0 && _canalAtual) {
            const faixa = startTime ? `${startTime}${endTime ? ' - ' + endTime : ''}  ·  ` : '';
            mostrarInfoCanal(null, faixa + title);
        }
    });
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
        const vodScreen = document.getElementById('vod-detail-screen');
        const isVodVisible = vodScreen && window.getComputedStyle(vodScreen).display !== 'none';
        const seriesScreen = document.getElementById('series-detail-screen');
        const isSeriesVisible = seriesScreen && window.getComputedStyle(seriesScreen).display !== 'none';
        const searchScreenNav = document.getElementById('search-tv-screen');
        const isSearchVisible = searchScreenNav && window.getComputedStyle(searchScreenNav).display !== 'none';
        const telaCfg = document.getElementById('settings-screen');
        const cfgVisivel = telaCfg && telaCfg.style.display !== 'none';

        if (cfgVisivel) {
            // Configurações é tela cheia: o seletor não pode alcançar a home
            // por trás dela. Só o painel aberto entra, senão o D-pad passearia
            // por controles de abas que não estão à vista.
            const painelAberto = telaCfg.querySelector('.cfg-painel.active');
            focusables = Array.from(telaCfg.querySelectorAll('.cfg-aba'))
                .concat(painelAberto ? Array.from(painelAberto.querySelectorAll('button, [tabindex="0"]')) : []);
        } else if (isVkVisible) {
            focusables = Array.from(vkContainer.querySelectorAll('button, [tabindex="0"]'));
        } else if (isExitModalVisible) {
            focusables = Array.from(exitModal.querySelectorAll('button, [tabindex="0"]'));
        } else if (isUpdateModalVisible) {
            focusables = Array.from(updateModal.querySelectorAll('button, [tabindex="0"]'));
        } else if (isVodVisible) {
            focusables = Array.from(vodScreen.querySelectorAll('button, [tabindex="0"]'));
        } else if (isSeriesVisible) {
            // Mesma lógica do modal de filme: sem isto, o D-pad varria o
            // documento inteiro (fallback genérico abaixo) e podia escapar
            // pra fora da tela de série, ou considerar candidatos de telas
            // escondidas por trás — o que tornava a navegação até os
            // episódios imprevisível.
            focusables = Array.from(seriesScreen.querySelectorAll('button, [tabindex="0"]'));
        } else if (isSearchVisible) {
            // Mesmo motivo da tela de série: sem isto, cada tecla no teclado
            // virtual (ou seta entre os cards de resultado) varria o
            // documento inteiro — com o teclado (30+ teclas) mais a grade de
            // resultados, era o mais pesado de todos os fallbacks genéricos.
            focusables = Array.from(searchScreenNav.querySelectorAll('input, button, [tabindex="0"]'));
        } else {
            focusables = Array.from(document.querySelectorAll('input, button, [tabindex="0"]'));
        }
            
        let active = document.activeElement;
        const activeRow = active ? active.closest('.home-row') : null;
        if (activeRow && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
            focusables = Array.from(activeRow.querySelectorAll('.vod-item, [tabindex="0"]'));
        }

        // Uma passada só, guardando o rect de cada focável. Antes este trecho
        // chamava getComputedStyle DUAS vezes por elemento e o laço de direção
        // logo abaixo pedia getBoundingClientRect de novo — numa categoria com
        // mil canais davam ~2000 recálculos síncronos de estilo e ~2000 de
        // layout POR TECLA. É daí que vinha o engasgo ao segurar a seta.
        const vpW = document.documentElement.clientWidth || window.innerWidth;
        const vpH = document.documentElement.clientHeight || window.innerHeight;

        const rectDe = new Map();
        focusables = focusables.filter(el => {
            const rect = el.getBoundingClientRect();
            // Largura/altura zeradas já cobrem display:none
            if (rect.width <= 0 || rect.height <= 0) return false;
            // Descarta o que está longe demais para ser alvo de um passo. A
            // margem é de uma tela inteira em cada sentido, então o vizinho
            // logo abaixo da dobra continua alcançável.
            if (rect.bottom < -vpH || rect.top > vpH * 2) return false;
            if (rect.right < -vpW || rect.left > vpW * 2) return false;
            rectDe.set(el, rect);
            return true;
        });

        // visibility:hidden não zera o rect, então ainda exige consultar estilo.
        // A diferença é que agora isso roda sobre a dúzia que sobrou, não sobre
        // a lista inteira.
        focusables = focusables.filter(el => window.getComputedStyle(el).visibility !== 'hidden');

        if (focusables.length === 0) return;

        if (!focusables.includes(active)) {
            focusables[0].focus();
            e.preventDefault();
            return;
        }

        e.preventDefault(); // Impede scroll padrão do navegador na TV

        const activeRect = rectDe.get(active) || active.getBoundingClientRect();
        let bestCandidate = null;
        let minDistance = Infinity;

        focusables.forEach(cand => {
            if (cand === active) return;
            const candRect = rectDe.get(cand);
            
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

        // ── NAV PADRONIZADA: TOP-NAV <-> CONTEÚDO ─────────────────────────
        // ArrowDown em qualquer botão do top-nav → primeiro focável do conteúdo ativo
        // ArrowLeft/Right no top-nav → só navega dentro do nav, nunca vaza para conteúdo
        if (active && active.closest && active.closest('.top-nav')) {
            const navItems = focusables.filter(el => el.closest('.top-nav'));

            if (e.key === 'ArrowDown') {
                // Desce para o primeiro focável do conteúdo
                const firstContent = focusables.find(el => !el.closest('.top-nav'));
                if (firstContent) {
                    const agora = Date.now(); _ultimaNavegacao = agora;
                    firstContent.focus({ preventScroll: true });
                    firstContent.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                }
                return; // sempre consome o evento no nav
            }

            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                // Navega só entre itens do nav, sem vazar para baixo
                const idx = navItems.indexOf(active);
                if (e.key === 'ArrowLeft' && idx > 0) {
                    navItems[idx - 1].focus({ preventScroll: true });
                } else if (e.key === 'ArrowRight' && idx < navItems.length - 1) {
                    navItems[idx + 1].focus({ preventScroll: true });
                }
                // Se já no extremo, não faz nada — seletor para no limite
                return;
            }
        }
        // ──────────────────────────────────────────────────────────────────


        if (bestCandidate) {
            // Segurando a seta, as rolagens suaves se enfileiram e a navegação
            // parece travada. Em movimentos rápidos usamos rolagem instantânea;
            // em toques isolados mantemos a suave, que fica mais agradável.
            const agora = Date.now();
            const rapido = (agora - _ultimaNavegacao) < 250;
            _ultimaNavegacao = agora;
            const comportamento = rapido ? 'auto' : 'smooth';

            bestCandidate.focus({ preventScroll: true });
            if (bestCandidate.closest('.top-nav')) {
                const scrollArea = document.querySelector('.home-scroll-area');
                if (scrollArea) {
                    scrollArea.scrollTo({ top: 0, behavior: comportamento });
                }
            } else {
                bestCandidate.scrollIntoView({ behavior: comportamento, block: 'nearest', inline: 'nearest' });
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

// Marca/desmarca o campo que está recebendo o texto do teclado virtual
function marcarCampoDigitando(input, ativo) {
    if (!input) return;
    input.classList.toggle('digitando', ativo);
    const grupo = input.closest('.input-group');
    if (grupo) grupo.classList.toggle('digitando', ativo);
}

/* Teclado virtual só na TV.
   No navegador existe o teclado do PC; no celular, o teclado do sistema. Nos
   dois casos o teclado da interface só atrapalha. Na TV ele continua sendo o
   único jeito de digitar, já que só há D-pad. */
const USA_TECLADO_VIRTUAL = (() => {
    if (!window.AndroidApp) return false;                          // navegador
    if (typeof window.AndroidApp.isTv !== 'function') return true;  // APK antigo: mantém o comportamento de antes
    try { return !!window.AndroidApp.isTv(); } catch (e) { return true; }
})();

// Os três campos nascem readonly no HTML porque, na TV, só o teclado da
// interface pode preenchê-los. Fora dela isso precisa sair — senão o teclado
// do aparelho até sobe, mas não escreve nada.
if (!USA_TECLADO_VIRTUAL) {
    ['username', 'password', 'search-input-field'].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.removeAttribute('readonly');
    });
}

function openKeyboard(inputId) {
    const campo = document.getElementById(inputId);

    // Sem teclado virtual: entrega o foco ao campo e deixa o teclado do
    // aparelho (ou do PC) aparecer sozinho.
    if (!USA_TECLADO_VIRTUAL) {
        if (campo) campo.focus();
        return;
    }

    // Limpa a marcação de um campo anterior antes de trocar de alvo
    marcarCampoDigitando(currentInput, false);

    currentInput = campo;
    marcarCampoDigitando(currentInput, true);

    const vk = document.getElementById('virtual-keyboard');
    vk.style.display = 'flex';
    isKeyboardOpen = true;
    // Foca na primeira tecla 'q'
    setTimeout(() => { document.querySelector('.vk-key').focus(); }, 100);
}

function closeKeyboard() {
    document.getElementById('virtual-keyboard').style.display = 'none';
    isKeyboardOpen = false;
    marcarCampoDigitando(currentInput, false);
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

    // O teclado virtual escreve direto no .value, o que não dispara 'input' —
    // então o rascunho é salvo à mão aqui.
    const salvarSeUsuario = () => {
        if (currentInput && currentInput.id === 'username') salvarRascunhoUsuario();
    };

    let val = keyElement.getAttribute('data-val') || keyElement.innerText;

    if (val === 'SUBMIT') {
        closeKeyboard();
        return;
    }
    if (val === 'CLEAR') {
        currentInput.value = '';
        salvarSeUsuario();
        return;
    }
    if (val === 'BACKSPACE' || val === '⌫') {
        currentInput.value = currentInput.value.slice(0, -1);
        salvarSeUsuario();
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
    salvarSeUsuario();
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

// ==========================================
// TELA CHEIA DO MINI-PLAYER (TV AO VIVO)
// Usa classe CSS em vez da Fullscreen API: a WebView do Android ignora
// requestFullscreen() sem onShowCustomView no WebChromeClient. Assim o vídeo
// não é recriado — ao voltar, categoria/canal/scroll continuam como estavam.
// ==========================================
function playerEstaEmTelaCheia() {
    const c = document.querySelector('.live-player-container');
    return !!(c && c.classList.contains('fullscreen'));
}

// Controle de reconexão do player ao vivo
const MAX_TENTATIVAS_LIVE = 3;
let _liveRetry = { url: null, count: 0 };
let _liveRetryTimer = null;

function abrirPlayerTelaCheia() {
    const c = document.querySelector('.live-player-container');
    if (!c || c.classList.contains('fullscreen')) return;
    c.classList.add('fullscreen');
    // Ao expandir, apresenta o canal: a faixa já está preenchida desde a
    // seleção, só faltava a tela cheia para poder aparecer.
    if (_canalAtual) mostrarInfoCanal(null, undefined);
}

function fecharPlayerTelaCheia() {
    const c = document.querySelector('.live-player-container');
    if (!c || !c.classList.contains('fullscreen')) return;
    c.classList.remove('fullscreen');

    // Recolheu: a faixa não pertence ao mini-player
    clearTimeout(_timerInfoCanal);
    const info = document.getElementById('canal-info-overlay');
    if (info) info.classList.remove('visivel');

    // Devolve o foco ao canal que estava tocando, na mesma categoria
    const canalAtivo = document.querySelector('.live-channel-item.active');
    if (canalAtivo) {
        setTimeout(() => {
            canalAtivo.focus();
            canalAtivo.scrollIntoView({ block: 'nearest' });
        }, 50);
    }
}

/* Reprodução HLS. Preferimos hls.js (MSE); se não carregar mas o aparelho
   tocar HLS nativamente (comum em TV), caímos para o <video> direto. */
function tocarHls(url, videoElement, overlay, loader, tituloEl, falhar) {
    if (overlay) overlay.style.display = 'block';
    if (loader) loader.style.display = 'block';

    // Solta qualquer player anterior (TS ou HLS) antes de abrir a nova fonte
    destruirPlayerMpegts(mpegtsPlayer);
    mpegtsPlayer = null;
    destruirHls();

    videoElement.onplaying = () => {
        if (overlay) overlay.style.display = 'none';
        if (loader) loader.style.display = 'none';
    };

    if (_liveRetry.url !== url) _liveRetry = { url: url, count: 0 };

    // Reconecta em erro transitório, mesmo esquema do caminho TS
    const tentarDeNovo = () => {
        if (_liveRetry.count >= MAX_TENTATIVAS_LIVE) {
            falhar('Não foi possível conectar a este canal.');
            return;
        }
        _liveRetry.count++;
        if (loader) loader.style.display = 'block';
        if (tituloEl) tituloEl.innerText = `Reconectando (${_liveRetry.count}/${MAX_TENTATIVAS_LIVE})...`;
        clearTimeout(_liveRetryTimer);
        _liveRetryTimer = setTimeout(() => {
            if (localStorage.getItem('current_category') !== 'tv') return;
            const telaAoVivo = document.getElementById('live-tv-screen');
            if (!telaAoVivo || telaAoVivo.style.display === 'none') return;
            playLiveStream(url);
        }, 1500);
    };

    videoElement.addEventListener('playing', () => { _liveRetry.count = 0; }, { once: true });

    carregarHlsJs().then((temHls) => {
        if (temHls && window.Hls && window.Hls.isSupported()) {
            hlsPlayer = new window.Hls({
                enableWorker: true,
                lowLatencyMode: false,
                // Buffer generoso: absorve oscilação de rede, como no caminho TS
                backBufferLength: 30,
                maxBufferLength: 30
            });
            hlsPlayer.loadSource(url);
            hlsPlayer.attachMedia(videoElement);
            hlsPlayer.on(window.Hls.Events.MANIFEST_PARSED, () => {
                videoElement.play().catch(e => console.log('Autoplay bloqueado:', e));
            });
            hlsPlayer.on(window.Hls.Events.ERROR, (evt, data) => {
                if (!data || !data.fatal) return; // só erros fatais interessam
                console.error('Erro HLS:', data.type, data.details);
                destruirHls();
                tentarDeNovo();
            });
            return;
        }

        // Sem hls.js utilizável: tenta o suporte nativo do aparelho
        if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = url;
            videoElement.play().catch(e => console.log('Autoplay bloqueado:', e));
            videoElement.onerror = () => tentarDeNovo();
            return;
        }

        falhar('Este canal não pôde ser reproduzido neste dispositivo.');
    });
}

function playLiveStream(url) {
    const videoElement = document.getElementById('live-player');
    const overlay = document.getElementById('live-player-overlay');
    const loader = document.getElementById('live-player-loader');
    
    if (!videoElement) return;

    const tituloEl = document.getElementById('live-player-title');
    const falhar = (msg) => {
        if (loader) loader.style.display = 'none';
        if (overlay) overlay.style.display = 'block';
        if (tituloEl) tituloEl.innerText = msg;
    };

    // Formato HLS: o getStreamUrl monta a URL com .m3u8. O mpegts.js não
    // decodifica HLS, então este caminho usa o hls.js (ou o suporte nativo do
    // aparelho, quando houver). É o que faltava para a opção HLS funcionar.
    if (/\.m3u8(\?|$)/i.test(url)) {
        tocarHls(url, videoElement, overlay, loader, tituloEl, falhar);
        return;
    }

    // Biblioteca vem de CDN: sem internet ela não carrega e o player ficaria travado no loader
    if (typeof mpegts === 'undefined' || !mpegts.getFeatureList().mseLivePlayback) {
        return falhar('Não foi possível iniciar o player. Verifique a conexão.');
    }

    // Mostra o overlay e o loader enquanto o vídeo carrega
    if (overlay) overlay.style.display = 'block';
    if (loader) loader.style.display = 'block';

    // Troca de canal: o anterior tem que soltar a conexão antes de abrir a nova,
    // senão os dois streams baixam ao mesmo tempo.
    destruirPlayerMpegts(mpegtsPlayer);
    mpegtsPlayer = null;

    // Oculta o loader e o overlay assim que o vídeo começar a rodar
    videoElement.onplaying = () => {
        if (overlay) overlay.style.display = 'none';
        if (loader) loader.style.display = 'none';
    };

    // Reinicia o contador quando o canal muda
    if (_liveRetry.url !== url) _liveRetry = { url: url, count: 0 };

    mpegtsPlayer = mpegts.createPlayer(
        { type: 'mpegts', isLive: true, url: url },
        {
            // Buffer ligado: absorve oscilação da rede e evita travar/pular cenas
            enableStashBuffer: true,
            stashInitialSize: 384 * 1024,
            // NÃO perseguir a borda do ao vivo: era isso que fazia o vídeo saltar
            liveBufferLatencyChasing: false,
            lazyLoad: false,
            // Descarta o que já passou, senão a memória cresce sem parar no ao vivo
            autoCleanupSourceBuffer: true,
            autoCleanupMaxBackwardDuration: 30,
            autoCleanupMinBackwardDuration: 10
        }
    );

    // Streams ao vivo têm quedas transitórias: tenta reconectar antes de desistir
    mpegtsPlayer.on(mpegts.Events.ERROR, (tipo, detalhe) => {
        console.error('Erro no player ao vivo:', tipo, detalhe, 'tentativa', _liveRetry.count);

        if (tipo === mpegts.ErrorTypes.NETWORK_ERROR && _liveRetry.count < MAX_TENTATIVAS_LIVE) {
            _liveRetry.count++;
            if (loader) loader.style.display = 'block';
            if (tituloEl) tituloEl.innerText = `Reconectando (${_liveRetry.count}/${MAX_TENTATIVAS_LIVE})...`;
            clearTimeout(_liveRetryTimer);
            _liveRetryTimer = setTimeout(() => {
                // Um erro em voo pode agendar a reconexão logo depois de o
                // usuário trocar de aba. Sem esta checagem o player voltava a
                // tocar fora da TV ao vivo, sem nada visível na tela.
                // A categoria salva é a fonte confiável: o display da tela pode
                // ter sido alterado por qualquer um dos caminhos de navegação.
                if (localStorage.getItem('current_category') !== 'tv') return;
                const telaAoVivo = document.getElementById('live-tv-screen');
                if (!telaAoVivo || telaAoVivo.style.display === 'none') return;
                playLiveStream(url);
            }, 1500);
            return;
        }

        falhar(tipo === mpegts.ErrorTypes.NETWORK_ERROR
            ? 'Não foi possível conectar a este canal.'
            : 'Este canal não pôde ser reproduzido neste dispositivo.');
    });

    // Deu certo: zera o contador de tentativas
    videoElement.addEventListener('playing', () => { _liveRetry.count = 0; }, { once: true });

    mpegtsPlayer.attachMediaElement(videoElement);
    mpegtsPlayer.load();
    mpegtsPlayer.play().catch(e => console.log('Autoplay prevented:', e));
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

    // Autoplay do próximo episódio: só entra em ação quando o player foi
    // aberto a partir da lista de episódios da série (window._seriesAutoplayList).
    // Filme e episódio avulso fora dessa lista simplesmente terminam, como antes.
    fsPlayer.addEventListener('ended', () => {
        const lista = window._seriesAutoplayList;
        const atual = window._seriesAutoplayIndex;
        if (!lista || atual == null || atual < 0) return;
        const proximo = atual + 1;
        if (lista[proximo]) {
            tocarEpisodioDaLista(proximo);
        }
    });

    fsPlayer.addEventListener('pause', () => {
        iconPause.style.display = 'none';
        iconPlay.style.display = 'block';
        showUi();
    });

    // btnBack e btnFullscreen foram removidos do HTML

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

/**
 * Ponto único de parada do ao vivo: mini-player, tela cheia e reconexão.
 *
 * Existiam duas paradas independentes — uma dentro de mostrarCategoria e outra
 * em pararTudo — e elas divergiram. A da troca de aba destruía o player mas NÃO
 * limpava _liveRetryTimer: se houvesse reconexão agendada, 1,5s depois de sair
 * da TV ao vivo o setTimeout disparava playLiveStream e recriava o player, que
 * seguia tocando sem nada visível na tela. Com um ponto só, não há como uma das
 * duas esquecer um passo de novo.
 */
/**
 * Desmonta um player mpegts.js na ordem que a biblioteca exige.
 *
 * Só chamar destroy() NÃO basta: quem aborta o carregador de rede é o unload().
 * Sem ele a conexão HTTP do stream continua aberta e o transmuxer segue
 * consumindo — o canal continuava tocando depois de trocar de aba.
 *
 * Cada passo vai em seu próprio try: se um falhar, os seguintes ainda rodam.
 * Antes um destroy() que lançasse zerava a referência e deixava o player vivo
 * e inalcançável.
 */
function destruirPlayerMpegts(p) {
    if (!p) return;
    try { p.pause(); } catch (e) {}
    try { p.unload(); } catch (e) {}
    try { p.detachMediaElement(); } catch (e) {}
    try { p.destroy(); } catch (e) {}
}

// Instância única do player HLS (só existe quando o formato HLS é usado).
let hlsPlayer = null;

function destruirHls() {
    if (!hlsPlayer) return;
    try { hlsPlayer.stopLoad(); } catch (e) {}
    try { hlsPlayer.detachMedia(); } catch (e) {}
    try { hlsPlayer.destroy(); } catch (e) {}
    hlsPlayer = null;
}

/* hls.js é carregado sob demanda: só quem escolhe HLS paga o download, e uma
   única vez por sessão. Quem fica no TS (padrão) nunca baixa a biblioteca. */
let _hlsJsPromise = null;
function carregarHlsJs() {
    if (window.Hls) return Promise.resolve(true);
    if (_hlsJsPromise) return _hlsJsPromise;
    _hlsJsPromise = new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
        s.onload = () => resolve(!!window.Hls);
        s.onerror = () => { _hlsJsPromise = null; resolve(false); };
        document.head.appendChild(s);
    });
    return _hlsJsPromise;
}

function pararPlayerAoVivo() {
    clearTimeout(_liveRetryTimer);
    _liveRetryTimer = null;
    _liveRetry = { url: null, count: 0 };

    esconderInfoCanal();

    destruirPlayerMpegts(mpegtsPlayer);
    mpegtsPlayer = null;

    destruirPlayerMpegts(fsMpegtsPlayer);
    fsMpegtsPlayer = null;

    destruirHls();

    ['live-player', 'fullscreen-player'].forEach(id => {
        const v = document.getElementById(id);
        if (!v) return;
        try {
            v.pause();
            // srcObject cobre o caso de o MediaSource ter sido anexado por
            // objeto em vez de URL; removeAttribute sozinho não o solta.
            v.srcObject = null;
            v.removeAttribute('src');
            // load() com o src já removido é o que efetivamente encerra a
            // requisição de rede pendente no WebView.
            v.load();
        } catch (e) {}
    });
}

/* App saiu de vista: corta todo vídeo.
   O onUserLeaveHint do MainActivity já cobre o botão Home, mas não os casos em
   que o app continua vivo e apenas deixa de aparecer — descanso de tela da TV,
   painel apagado, diálogo do sistema por cima, chamada entrando no celular. Sem
   isto o mpegts.js seguia baixando o stream com a tela apagada.
   Só para; não retoma sozinho ao voltar. */
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && typeof window.pararTudo === 'function') {
        window.pararTudo();
    }
});

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

function closeFullscreenPlayer() {
    const fsContainer = document.getElementById('fs-player-container');
    const fsPlayer = document.getElementById('fullscreen-player');
    if (!fsContainer || !fsPlayer) return;

    if (document.fullscreenElement || document.webkitIsFullScreen) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
    
    destruirPlayerMpegts(fsMpegtsPlayer);
    fsMpegtsPlayer = null;

    fsPlayer.pause();
    fsPlayer.src = '';
    fsContainer.style.display = 'none';

    // Devolve o container pra dentro de #tv-canvas (ver playFullscreenVideo) e
    // restaura as unidades do canvas — sem isto, a próxima vez que qualquer
    // outra coisa dependesse da ordem normal do DOM dentro do canvas
    // encontraria o player fora do lugar.
    const tvCanvas = document.getElementById('tv-canvas');
    if (tvCanvas && fsContainer.parentElement !== tvCanvas) {
        tvCanvas.appendChild(fsContainer);
        fsContainer.style.width = 'var(--tv-w)';
        fsContainer.style.height = 'var(--tv-h)';
    }

    // Se o usuário saiu antes do 'playing' disparar, o loader nunca foi
    // escondido — trava aberto pra próxima vez que abrir o player.
    const fsLoader = document.getElementById('fs-player-loader');
    if (fsLoader) fsLoader.style.display = 'none';

    // Restaura o canal do mini-player — mas SÓ se ainda estivermos na TV ao
    // vivo. Sem esta checagem, fechar um filme em Filmes/Séries encontrava o
    // canal ainda marcado como ativo de uma visita anterior e religava o
    // stream ao vivo fora da aba: áudio em segundo plano e, pior, um segundo
    // decodificador aberto logo depois de um vídeo 4K.
    if (localStorage.getItem('current_category') !== 'tv') return;

    const activeChannel = document.querySelector('.live-channel-item.active');
    if (activeChannel) {
        reiniciarPreviewCanal(activeChannel);
        setTimeout(() => activeChannel.focus(), 100);
    }
}

function reiniciarPreviewCanal(itemElement) {
    const ch = itemElement._channelData;
    if (!ch) return;
    
    document.getElementById("live-player-title").innerText = ""; // sem rótulo sobre o vídeo (o elemento segue sendo usado para mensagens de erro)
    
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

    // Fora da TV a busca também reage à digitação nativa (o readonly já foi
    // removido junto com o dos campos de login), mas o teclado na tela continua
    // visível e clicável — útil pra testar no navegador sem perder o padrão da TV.
    if (!USA_TECLADO_VIRTUAL && inputField) {
        inputField.addEventListener('input', () => realizarBusca(inputField.value));
    }

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
    placeholder.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:150px; width:100%;"><div class="spinner" style="--spinner-size:46px;"></div></div>';
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
    
    let iconHtml = item.streamIcon ? `<img src="${item.streamIcon}" class="vod-item-poster" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '';
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
        if (e.key === "Enter") { e.preventDefault(); div.click(); }
    };
    
    return div;
}

// Controlador unificado de navegação para botão Voltar (Escape / Back remoto)
window.handleAndroidBack = function() {
    // Tela cheia do mini-player: apenas recolhe, mantendo a tela de TV ao vivo
    // exatamente como estava (mesma categoria, mesmo canal, sem recarregar o vídeo)
    if (playerEstaEmTelaCheia()) {
        fecharPlayerTelaCheia();
        return;
    }

    // Configurações é tela cheia: Voltar aqui significa sair dela
    if (configuracoesAbertas()) {
        fecharConfiguracoes();
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

    // 1. Se o player de vídeo em tela cheia estiver aberto, pede confirmação
    const playerContainer = document.getElementById('fs-player-container');
    if (playerContainer && playerContainer.style.display !== 'none') {
        abrirExitModal();
        return;
    }

    // 2. Se a tela de detalhes do VOD estiver aberta, fecha ela
    const vodDetailScreen = document.getElementById('vod-detail-screen');
    if (vodDetailScreen && vodDetailScreen.style.display !== 'none') {
        closeVodModal();
        return;
    }

    // 2.1. Se a tela de detalhes de série estiver aberta, fecha ela
    const seriesDetailScreen = document.getElementById('series-detail-screen');
    if (seriesDetailScreen && seriesDetailScreen.style.display !== 'none') {
        fecharSeriesDetailScreen();
        return;
    }

    // 2.5. Se a tela de catálogo por streaming (Netflix, etc.) estiver aberta, fecha ela
    const providerScreen = document.getElementById('provider-screen');
    if (providerScreen && providerScreen.style.display !== 'none') {
        fecharProviderScreen();
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

// Chamado pelo Android quando o app está saindo (Home/Recentes).
// Sem isso o mpegts.js continuaria baixando o stream mesmo com o app fechando.
window.pararTudo = function () {
    try {
        pararPlayerAoVivo();
        // Varre o resto: VOD em tela cheia e qualquer <video> que tenha sobrado.
        // Chamado quando o app sai de cena (onUserLeaveHint no MainActivity),
        // então aqui a rede tem mesmo que ficar em silêncio.
        document.querySelectorAll('video').forEach(v => {
            try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {}
        });
    } catch (e) {
        console.error('Erro ao parar reprodução:', e);
    }
};

// Inicializar teclado de busca
initSearchKeyboard();
iniciarRascunhoLogin();
iniciarConfiguracoes();

// =======================================================
// EXIT CONFIRMATION MODAL LOGIC
// =======================================================
let lastFocusedBeforeExit = null;

function abrirExitModal() {
    lastFocusedBeforeExit = document.activeElement;
    const modal = document.getElementById('exit-confirm-modal');
    const playerContainer = document.getElementById('fs-player-container');
    const playerTocando = playerContainer && playerContainer.style.display !== 'none';
    const titleEl = modal ? modal.querySelector('.exit-modal-title') : null;
    if (titleEl) {
        if (playerTocando) {
            titleEl.textContent = 'Deseja realmente fechar a reprodução?';
        } else {
            titleEl.textContent = 'Deseja realmente sair do aplicativo?';
        }
    }
    // Esta confirmação abre por cima do player ainda tocando (não fecha ele
    // antes). Como o player em si sai de dentro de #tv-canvas enquanto toca
    // (ver playFullscreenVideo), o modal precisa acompanhar pro mesmo nível —
    // senão fica escondido atrás do vídeo em vez de aparecer por cima.
    const tvCanvas = document.getElementById('tv-canvas');
    if (modal && playerTocando && tvCanvas && modal.parentElement === tvCanvas) {
        document.body.appendChild(modal);
        modal.style.width = '100vw';
        modal.style.height = '100vh';
    }
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
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
            // Devolve pro lugar original dentro de #tv-canvas, se tiver sido
            // movido em abrirExitModal (player tocando por trás).
            const tvCanvas = document.getElementById('tv-canvas');
            if (tvCanvas && modal.parentElement !== tvCanvas) {
                tvCanvas.appendChild(modal);
                modal.style.width = 'var(--tv-w)';
                modal.style.height = 'var(--tv-h)';
            }
            if (lastFocusedBeforeExit) {
                lastFocusedBeforeExit.focus();
                lastFocusedBeforeExit = null;
            }
        }, 300);
    }
}

function confirmarSaida() {
    const playerContainer = document.getElementById('fs-player-container');
    if (playerContainer && playerContainer.style.display !== 'none') {
        fecharExitModal();
        closeFullscreenPlayer();
        return;
    }
    if (window.AndroidApp && window.AndroidApp.exitApp) {
        window.AndroidApp.exitApp();
    }
}

// =======================================================
// AUTO-UPDATE MODAL LOGIC
// =======================================================

