package com.black.pro

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.ViewModelProvider
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import com.black.pro.ui.IPTVViewModel
import com.black.pro.util.SessionManager
import com.black.pro.vpn.DnsVpnService

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var playerView: PlayerView
    private lateinit var viewModel: IPTVViewModel
    private var exoPlayer: ExoPlayer? = null

    // Precisa ser registrado antes da Activity chegar em STARTED — por isso é
    // campo de classe, e não algo criado sob demanda dentro de onCreate.
    private val vpnPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            iniciarServicoDns()
        } else {
            // Usuário recusou a permissão de VPN nas configurações do sistema
            notificarResultadoDns(false)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Configuração de Tela Cheia (Otimizado para TV)
        try {
            WindowCompat.setDecorFitsSystemWindows(window, false)
            val controller = WindowInsetsControllerCompat(window, window.decorView)
            controller.hide(WindowInsetsCompat.Type.systemBars())
            controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Instanciar dependências
        val sessionManager = SessionManager(this)
        viewModel = ViewModelProvider(this)[IPTVViewModel::class.java]

        // Criar e configurar a WebView programaticamente
        webView = WebView(this)
        // Inspeção remota (chrome://inspect) só em build de depuração.
        // Ligada em release, qualquer um com acesso ao aparelho poderia ler o
        // conteúdo da WebView — inclusive a sessão do usuário.
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
        // Remove as barras de rolagem nativas da WebView (UI de TV não usa scrollbar)
        webView.isVerticalScrollBarEnabled = false
        webView.isHorizontalScrollBarEnabled = false
        webView.scrollBarStyle = android.view.View.SCROLLBARS_INSIDE_OVERLAY
        webView.overScrollMode = WebView.OVER_SCROLL_NEVER

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            // A página vive em file:///android_asset/, ou seja, origem opaca. O
            // mpegts.js busca o .ts por XHR, o que conta como cross-origin e o
            // WebView bloqueia por padrão — o erro chega como NETWORK_ERROR e o
            // player entra no laço de "Reconectando (n/3)" sem nunca abrir o
            // canal. WebViews antigas de TV eram permissivas; as atuais (S24)
            // aplicam a regra, por isso falhava só no celular.
            //
            // Seguro aqui porque a WebView carrega exclusivamente o index.html
            // empacotado no APK — nunca conteúdo remoto ou de terceiros.
            allowUniversalAccessFromFileURLs = true
            mediaPlaybackRequiresUserGesture = false // Importante para vídeos em TV

            // Quem escala o layout agora é o CSS (#tv-canvas, canvas fixo de
            // 1280x720 + transform). O WebView deve entregar o viewport real,
            // sem zoom próprio: com estes ligados as duas escalas se somavam e
            // distorciam o layout em painéis fora de 16:9.
            useWideViewPort = false
            loadWithOverviewMode = false
            // Trava o zoom de texto: a acessibilidade do sistema aumentaria a
            // fonte e quebraria as medidas fixas do canvas.
            textZoom = 100
        }

        // Previne que links abram no navegador externo e contorna erros de Handshake SSL
        webView.webViewClient = object : WebViewClient() {
            @SuppressLint("WebViewClientOnReceivedSslError")
            override fun onReceivedSslError(
                view: WebView?,
                handler: android.webkit.SslErrorHandler?,
                error: android.net.http.SslError?
            ) {
                handler?.proceed() // Ignora erros de certificado SSL (útil para emuladores e TVs com hora desregulada)
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                if (consoleMessage != null) {
                    android.util.Log.d("WebViewConsole", "${consoleMessage.message()} -- From line ${consoleMessage.lineNumber()} of ${consoleMessage.sourceId()}")
                }
                return super.onConsoleMessage(consoleMessage)
            }
        }

        // Adicionar a ponte JavaScript
        webView.addJavascriptInterface(
            WebAppInterface(this, webView, viewModel, sessionManager),
            "AndroidApp"
        )

        // PlayerView nativa (Media3/ExoPlayer) — usada pra todo VOD (filme/
        // episódio, ver tocarVideoNativo). Fica por cima da WebView na mesma
        // FrameLayout, escondida até ser preciso: o <video> do WebView compõe
        // cada quadro numa textura de GPU (SurfaceTexture), e em UHD alguns
        // chips de TV box corrompem essa textura — sai como imagem partida ao
        // meio. A PlayerView desenha direto numa superfície de vídeo dedicada,
        // fora desse caminho, com os próprios controles (play/pausa/avançar).
        playerView = PlayerView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            visibility = View.GONE
            keepScreenOn = true
            setShowNextButton(false)
            setShowPreviousButton(false)
        }

        val root = FrameLayout(this).apply {
            addView(webView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            addView(playerView)
        }
        setContentView(root)

        // Carregar o arquivo HTML principal
        webView.loadUrl("file:///android_asset/index.html")

        // Retoma a correção de DNS se o usuário deixou ligada numa sessão
        // anterior. Se a permissão de VPN já foi concedida, VpnService.prepare
        // devolve null e isto liga de novo sem pedir nada — só pede outra vez
        // se o usuário revogou a permissão pelas Configurações do Android.
        if (getSharedPreferences("black_app_prefs", Context.MODE_PRIVATE)
                .getBoolean("dns_fix_enabled", false)
        ) {
            ativarCorrecaoDns()
        }
    }

    /**
     * Ativa a VPN local que corrige a DNS do sistema (ver DnsVpnService).
     * Chamado pela ponte JS (Config > Rede) e na retomada automática acima.
     */
    fun ativarCorrecaoDns() {
        try {
            val intent = VpnService.prepare(this)
            if (intent != null) {
                vpnPermissionLauncher.launch(intent)
            } else {
                iniciarServicoDns()
            }
        } catch (e: Exception) {
            // Alguns TV boxes (firmware Android incompleto/genérico) não têm
            // o componente de sistema que mostra o diálogo de permissão de
            // VPN — prepare()/launch() lança ActivityNotFoundException nesses
            // aparelhos. Sem este catch, a exceção não tratada derrubava o
            // app inteiro (rodava dentro de runOnUiThread, chamado pela ponte
            // JS) — o cliente via só o app fechando sozinho ao tentar ativar.
            android.util.Log.w("MainActivity", "VPN de DNS indisponível neste aparelho", e)
            notificarResultadoDns(false)
        }
    }

    fun desativarCorrecaoDns() {
        try {
            startService(Intent(this, DnsVpnService::class.java).setAction(DnsVpnService.ACTION_STOP))
        } catch (e: Exception) {
            android.util.Log.w("MainActivity", "Falha ao parar a VPN de DNS", e)
        }
        getSharedPreferences("black_app_prefs", Context.MODE_PRIVATE)
            .edit().putBoolean("dns_fix_enabled", false).apply()
        notificarResultadoDns(false)
    }

    private fun iniciarServicoDns() {
        try {
            startService(Intent(this, DnsVpnService::class.java))
            getSharedPreferences("black_app_prefs", Context.MODE_PRIVATE)
                .edit().putBoolean("dns_fix_enabled", true).apply()
            notificarResultadoDns(true)
        } catch (e: Exception) {
            notificarResultadoDns(false)
        }
    }

    private fun notificarResultadoDns(ligado: Boolean) {
        try {
            webView.evaluateJavascript(
                "javascript:if(typeof window.onDnsFixResult === 'function') { window.onDnsFixResult($ligado); }",
                null
            )
        } catch (_: Exception) {
        }
    }

    // ---------- Player nativo (ExoPlayer) — todo VOD (filme/episódio) ----------

    /** Chamado pela ponte JS (WebAppInterface.tocarVideoNativo). */
    fun tocarVideoNativo(url: String) {
        pararVideoNativo()
        try {
            // Mesmo User-Agent que o proxy de desenvolvimento já usa pro Xtream
            // (scripts/dev/server.js) — painéis Xtream costumam filtrar por
            // User-Agent, e o ExoPlayer manda um próprio por padrão que o
            // provedor pode não reconhecer.
            val dataSourceFactory = DefaultHttpDataSource.Factory()
                .setUserAgent("IPTVSmarters/1.0 (okhttp/4.9.0)")
            val mediaSourceFactory = DefaultMediaSourceFactory(this)
                .setDataSourceFactory(dataSourceFactory)

            val player = ExoPlayer.Builder(this)
                .setMediaSourceFactory(mediaSourceFactory)
                .build()
            player.addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(playbackState: Int) {
                    if (playbackState == Player.STATE_ENDED) {
                        notificarVideoNativoTerminou()
                    }
                }

                override fun onPlayerError(error: PlaybackException) {
                    android.util.Log.w("MainActivity", "Erro no player nativo (VOD)", error)
                    notificarErroVideoNativo(error.message ?: "Falha ao reproduzir")
                }
            })

            exoPlayer = player
            playerView.player = player
            playerView.visibility = View.VISIBLE
            playerView.requestFocus()

            player.setMediaItem(MediaItem.fromUri(url))
            player.prepare()
            player.playWhenReady = true
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Falha ao iniciar o player nativo (VOD)", e)
            notificarErroVideoNativo(e.message ?: "Falha ao iniciar o player")
            pararVideoNativo()
        }
    }

    /** Chamado pela ponte JS e sempre que o app sai de cena. */
    fun pararVideoNativo() {
        if (::playerView.isInitialized) {
            playerView.player = null
            playerView.visibility = View.GONE
        }
        try {
            exoPlayer?.release()
        } catch (_: Exception) {
        }
        exoPlayer = null
    }

    fun videoNativoAtivo(): Boolean = ::playerView.isInitialized && playerView.visibility == View.VISIBLE

    private fun notificarVideoNativoTerminou() {
        try {
            webView.evaluateJavascript(
                "javascript:if(typeof window.onNativeVideoEnded === 'function') { window.onNativeVideoEnded(); }",
                null
            )
        } catch (_: Exception) {
        }
    }

    private fun notificarErroVideoNativo(mensagem: String) {
        val escapada = mensagem.replace("\\", "\\\\").replace("'", "\\'")
            .replace("\n", "\\n").replace("\r", "\\r")
        try {
            webView.evaluateJavascript(
                "javascript:if(typeof window.onNativeVideoError === 'function') { window.onNativeVideoError('$escapada'); }",
                null
            )
        } catch (_: Exception) {
        }
    }

    /**
     * O PlayerView (Media3) tem controles próprios com foco (D-pad) e, por
     * padrão, a primeira tecla Voltar só esconde esses controles — o evento
     * nunca chega em onBackPressed(), que só é chamado quando nenhuma view
     * filha consome a tecla antes. Resultado: o cliente apertava Voltar e o
     * player continuava preso na tela, tocando por trás dos controles já
     * escondidos. dispatchKeyEvent roda ANTES de qualquer view filha, então
     * intercepta e fecha o player direto, sem dar chance de o controle
     * "engolir" o evento primeiro.
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_BACK && event.action == KeyEvent.ACTION_UP && videoNativoAtivo()) {
            pararVideoNativo()
            return true
        }
        return super.dispatchKeyEvent(event)
    }

    override fun onBackPressed() {
        // Player nativo (VOD): ver dispatchKeyEvent acima — chega aqui só se
        // por algum motivo não tiver sido interceptado lá (ex.: back
        // acionado por gesto/botão do sistema em vez da tecla).
        if (videoNativoAtivo()) {
            pararVideoNativo()
            return
        }
        // Delega o comando de voltar de forma unificada para o JavaScript tratar as telas/modais
        webView.evaluateJavascript("javascript:if(typeof window.handleAndroidBack === 'function') { window.handleAndroidBack(); }", null)
    }

    /**
     * Chamado quando o usuário sai do app por ação própria (botão Home ou Recentes).
     *
     * O Android NÃO permite interceptar o botão Home — o sistema o consome antes de
     * chegar aqui, então não há como exibir uma confirmação e cancelar a saída.
     * O que dá para garantir é que o app não fique pendurado em segundo plano:
     * encerramos de vez, liberando o decodificador de vídeo e a conexão do stream.
     * Na próxima abertura o app inicia limpo (a sessão salva mantém o login).
     */
    /**
     * Chamado sempre que a Activity deixa de estar visível.
     *
     * Rede de segurança para o visibilitychange do app.js: nem toda WebView de
     * TV dispara o evento de forma confiável quando o painel apaga ou o sistema
     * põe algo por cima. Aqui a garantia é do Android, não do WebView.
     *
     * Cobre o que o onUserLeaveHint não pega — ele só dispara quando o usuário
     * sai por ação própria (Home/Recentes), não quando o app perde a tela por
     * descanso de tela, diálogo do sistema ou chamada entrando.
     *
     * Parar é idempotente, então não há problema em rodar duas vezes.
     */
    override fun onStop() {
        super.onStop()
        pararVideoNativo()
        try {
            webView.evaluateJavascript(
                "javascript:if(typeof window.pararTudo === 'function') { window.pararTudo(); }",
                null
            )
        } catch (_: Exception) {
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        pararReproducaoEFechar()
    }

    private fun pararReproducaoEFechar() {
        pararVideoNativo()
        try {
            // Interrompe o stream antes de sair, senão o player segue baixando em background
            webView.evaluateJavascript(
                "javascript:if(typeof window.pararTudo === 'function') { window.pararTudo(); }",
                null
            )
        } catch (_: Exception) {
        }
        finishAndRemoveTask()
    }
}
