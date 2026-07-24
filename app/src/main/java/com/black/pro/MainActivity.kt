package com.black.pro

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.ViewModelProvider
import com.black.pro.ui.IPTVViewModel
import com.black.pro.util.SessionManager
import com.black.pro.vpn.DnsVpnService

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var viewModel: IPTVViewModel

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

        // Definir a WebView como o conteúdo da Activity
        setContentView(webView)

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

    override fun onBackPressed() {
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
