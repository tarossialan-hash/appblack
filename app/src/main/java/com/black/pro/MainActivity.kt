package com.black.pro

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.ViewModelProvider
import com.black.pro.ui.IPTVViewModel
import com.black.pro.util.SessionManager

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var viewModel: IPTVViewModel

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
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            mediaPlaybackRequiresUserGesture = false // Importante para vídeos em TV
            
            // Habilita o modo de visão geral para escalar o layout de 1280px automaticamente
            useWideViewPort = true 
            loadWithOverviewMode = true
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
    }

    override fun onBackPressed() {
        // Delega o comando de voltar de forma unificada para o JavaScript tratar as telas/modais
        webView.evaluateJavascript("javascript:if(typeof window.handleAndroidBack === 'function') { window.handleAndroidBack(); }", null)
    }
}
