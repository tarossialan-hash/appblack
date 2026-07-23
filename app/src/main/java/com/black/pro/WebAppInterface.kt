package com.black.pro

import android.app.Activity
import android.app.UiModeManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.net.Uri
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.content.FileProvider
import com.black.pro.ui.IPTVViewModel
import com.black.pro.util.SessionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.first
import org.json.JSONArray
import org.json.JSONObject
import com.black.pro.data.local.AppDatabase
import com.black.pro.data.remote.NetworkModule
import com.black.pro.util.FavoritoItem
import com.black.pro.util.FavoritosManager
import com.google.gson.Gson
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

class WebAppInterface(
    private val activity: Activity,
    private val webView: WebView,
    private val viewModel: IPTVViewModel,
    private val sessionManager: SessionManager
) {

    private fun escapeJs(str: String): String {
        return str.replace("\\", "\\\\")
                  .replace("'", "\\'")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
    }

    @JavascriptInterface
    fun login(user: String, pass: String) {
        // Usa o ViewModel para simular o que o Compose fazia
        CoroutineScope(Dispatchers.Main).launch {
            try {
                viewModel.syncWithServer(
                    username = user, 
                    password = pass, 
                    isSilent = false,
                    onProgress = { progress, status ->
                        val percent = (progress * 100).toInt()
                        val escapedStatus = escapeJs(status)
                        webView.evaluateJavascript("javascript:updateSyncProgress($percent, '$escapedStatus')", null)
                    },
                    onError = { errorMsg ->
                        val escapedError = escapeJs(errorMsg)
                        webView.evaluateJavascript("javascript:onLoginError('$escapedError')", null)
                    }
                ) {
                    sessionManager.saveLogin(user, pass)
                    // Chama a função JS de sucesso
                    val escapedUser = escapeJs(user)
                    webView.evaluateJavascript("javascript:onLoginSuccess('$escapedUser')", null)
                }
            } catch (e: Exception) {
                webView.evaluateJavascript("javascript:onLoginError('Erro ao fazer login')", null)
            }
        }
    }

    @JavascriptInterface
    fun sync() {
        val user = sessionManager.getUsername() ?: return
        val pass = sessionManager.getPassword() ?: return
        CoroutineScope(Dispatchers.Main).launch {
            try {
                viewModel.syncWithServer(
                    username = user, 
                    password = pass, 
                    isSilent = false,
                    onProgress = { progress, status ->
                        val percent = (progress * 100).toInt()
                        val escapedStatus = escapeJs(status)
                        webView.evaluateJavascript("javascript:updateSyncProgress($percent, '$escapedStatus')", null)
                    },
                    onError = { errorMsg ->
                        val escapedError = escapeJs(errorMsg)
                        webView.evaluateJavascript("javascript:onLoginError('$escapedError')", null)
                    }
                ) {
                    val escapedUser = escapeJs(user)
                    webView.evaluateJavascript("javascript:onLoginSuccess('$escapedUser')", null)
                }
            } catch (e: Exception) {
                webView.evaluateJavascript("javascript:onLoginError('Erro ao sincronizar')", null)
            }
        }
    }

    @JavascriptInterface
    fun getUsername(): String {
        return sessionManager.getUsername() ?: ""
    }

    @JavascriptInterface
    fun getPassword(): String {
        return sessionManager.getPassword() ?: ""
    }

    @JavascriptInterface
    fun getBannerItems() {
        CoroutineScope(Dispatchers.Main).launch {
            val jsonArray = JSONArray()
            viewModel.bannerItems.forEach { item ->
                val obj = JSONObject()
                obj.put("id", item.id)
                obj.put("title", item.title)
                obj.put("overview", item.overview)
                // Adiciona o prefixo do TMDB para facilitar
                // w1280, não "original": o original vem em 3840x2160 e pesa de 2 a 5 MB
                // por destaque. Como são até 10 destaques validados antes de o banner
                // aparecer, isso somava dezenas de MB numa TV — em link degradado a tela
                // ficava preta por muito tempo. O banner ocupa ~960px de largura no
                // canvas, então w1280 já sobra.
                obj.put("backdropUrl", if (item.backdropPath.isNotEmpty()) "https://image.tmdb.org/t/p/w1280${item.backdropPath}" else "")
                obj.put("logoUrl", if (item.logoPath != null) "https://image.tmdb.org/t/p/w500${item.logoPath}" else "")
                obj.put("releaseYear", item.releaseYear)
                obj.put("voteAverage", item.voteAverage)
                obj.put("ageRating", item.ageRating ?: "")
                // Campos da linha de metadados do banner (tipo, data, duração, país, gênero)
                obj.put("mediaType", item.mediaType)
                obj.put("typeLabel", if (item.mediaType == "tv") "Série" else "Filme")
                obj.put("releaseDate", item.releaseDate)
                obj.put("runtime", item.runtime ?: "")
                obj.put("country", item.country)
                obj.put("genres", item.genreNames)
                jsonArray.put(obj)
            }
            webView.evaluateJavascript("javascript:onBannerItemsLoaded('${escapeJs(jsonArray.toString())}')", null)
        }
    }

    @JavascriptInterface
    fun getLiveCategories() {
        val u = sessionManager.getUsername() ?: return
        val p = sessionManager.getPassword() ?: return
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val dao = AppDatabase.getDatabase(activity.applicationContext).iptvDao()
                val categories = dao.getCategoriesByType("live").first()
                val jsonArray = JSONArray()
                categories.forEach { c -> 
                    val obj = JSONObject()
                    obj.put("categoryId", c.categoryId)
                    obj.put("categoryName", c.categoryName)
                    jsonArray.put(obj)
                }
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("javascript:onLiveCategoriesLoaded('${escapeJs(jsonArray.toString())}')", null)
                }
            } catch (e: Exception) { }
        }
    }

    @JavascriptInterface
    fun getLiveChannels(categoryId: String) {
        val u = sessionManager.getUsername() ?: return
        val p = sessionManager.getPassword() ?: return
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val dao = AppDatabase.getDatabase(activity.applicationContext).iptvDao()
                val channels = dao.getLiveStreamsByCategory(categoryId).first()
                val jsonArray = JSONArray()
                val sortedList = channels.sortedBy { it.name.trim().lowercase() }
                sortedList.forEach { ch ->
                    val obj = JSONObject()
                    obj.put("streamId", ch.streamId)
                    obj.put("name", ch.name)
                    obj.put("icon", ch.streamIcon ?: "")
                    jsonArray.put(obj)
                }
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("javascript:onLiveChannelsLoaded('${escapeJs(jsonArray.toString())}')", null)
                }
            } catch (e: Exception) { }
        }
    }

    // ---------- Configurações ----------

    private val prefs
        get() = activity.getSharedPreferences("black_app_prefs", android.content.Context.MODE_PRIVATE)

    /** "ts" (MPEGTS) ou "m3u8" (HLS). O provedor informa quais aceita em allowed_output_formats. */
    @JavascriptInterface
    fun getFormatoLive(): String = prefs.getString("formato_live", "ts") ?: "ts"

    @JavascriptInterface
    fun setFormatoLive(formato: String) {
        val valido = if (formato == "m3u8") "m3u8" else "ts"
        prefs.edit().putString("formato_live", valido).apply()
    }

    @JavascriptInterface
    fun getStreamUrl(streamId: Int): String {
        val u = sessionManager.getUsername() ?: return ""
        val p = sessionManager.getPassword() ?: return ""
        // A extensão sai daqui, e não do JS, para a URL ser montada num lugar só
        return "http://bkpac.cc/live/$u/$p/$streamId.${getFormatoLive()}"
    }

    /**
     * Dados da assinatura, do próprio player_api.php (a mesma chamada do login,
     * sem action, devolve user_info + server_info).
     */
    @JavascriptInterface
    fun getUserInfo() {
        val u = sessionManager.getUsername() ?: return
        val p = sessionManager.getPassword() ?: return
        CoroutineScope(Dispatchers.IO).launch {
            val obj = JSONObject()
            try {
                val resp = NetworkModule.iptvService.login(u, p)
                val info = resp.userInfo
                val srv = resp.serverInfo
                val fuso = srv?.timezone ?: "America/Sao_Paulo"

                obj.put("username", info?.username ?: u)
                obj.put("status", info?.status ?: "")
                obj.put("maxConnections", info?.maxConnections ?: "")
                obj.put("timezone", fuso)
                obj.put("allowedFormats", (info?.allowedOutputFormats ?: emptyList())
                    .joinToString(", ") { it.uppercase() })
                obj.put("expDate", formatarExpiracao(info?.expDate, fuso))
                obj.put("ok", true)
            } catch (e: Exception) {
                obj.put("ok", false)
                obj.put("erro", e.message ?: "Falha ao consultar a assinatura")
            }
            withContext(Dispatchers.Main) {
                webView.evaluateJavascript("javascript:onUserInfoLoaded('${escapeJs(obj.toString())}')", null)
            }
        }
    }

    /** exp_date vem como epoch em segundos; vazio ou nulo significa sem vencimento. */
    private fun formatarExpiracao(expDate: String?, fuso: String): String {
        val segundos = expDate?.toLongOrNull() ?: return "Sem vencimento"
        return try {
            val fmt = java.text.SimpleDateFormat("dd/MM/yyyy, HH:mm", java.util.Locale("pt", "BR"))
            fmt.timeZone = java.util.TimeZone.getTimeZone(fuso)
            "${fmt.format(java.util.Date(segundos * 1000))} ($fuso)"
        } catch (e: Exception) {
            "Sem vencimento"
        }
    }

    @JavascriptInterface
    fun getVodStreamUrl(streamId: Int, extension: String): String {
        val u = sessionManager.getUsername() ?: return ""
        val p = sessionManager.getPassword() ?: return ""
        return "http://bkpac.cc/movie/$u/$p/$streamId.$extension"
    }

    @JavascriptInterface
    fun getSeriesStreamUrl(episodeId: Int, extension: String): String {
        val u = sessionManager.getUsername() ?: return ""
        val p = sessionManager.getPassword() ?: return ""
        return "http://bkpac.cc/series/$u/$p/$episodeId.$extension"
    }

    @JavascriptInterface
    fun getSeriesInfo(seriesId: Int) {
        val u = sessionManager.getUsername() ?: return
        val p = sessionManager.getPassword() ?: return
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val info = NetworkModule.iptvService.getSeriesInfo(u, p, seriesId = seriesId)
                val json = Gson().toJson(info)
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("javascript:onSeriesInfoLoaded('${escapeJs(json)}')", null)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("javascript:onSeriesInfoLoaded('{}')", null)
                }
            }
        }
    }

    @JavascriptInterface
    fun getVodCategories() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val dao = AppDatabase.getDatabase(activity.applicationContext).iptvDao()
                val categories = dao.getCategoriesByType("movie").first()
                val jsonArray = JSONArray()
                categories.forEach { c -> 
                    val obj = JSONObject()
                    obj.put("categoryId", c.categoryId)
                    obj.put("categoryName", c.categoryName)
                    jsonArray.put(obj)
                }
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("javascript:onVodCategoriesLoaded('${escapeJs(jsonArray.toString())}')", null)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @JavascriptInterface
    fun getVodList(categoryId: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val dao = AppDatabase.getDatabase(activity.applicationContext).iptvDao()
                val movies = dao.getMoviesByCategory(categoryId).first()
                val jsonArray = JSONArray()
                // Recém-adicionados primeiro. Quem não tem data (added = 0) cai
                // para o fim, ordenado por nome, em vez de bagunçar o topo.
                val sortedList = movies.sortedWith(
                    compareByDescending<com.black.pro.data.local.entity.MovieEntity> { it.added }
                        .thenBy { it.name.trim().lowercase() }
                )
                sortedList.forEach { m ->
                    val obj = JSONObject()
                    obj.put("streamId", m.streamId)
                    obj.put("name", m.name)
                    obj.put("streamIcon", m.streamIcon)
                    obj.put("rating", m.rating)
                    obj.put("containerExtension", m.containerExtension)
                    jsonArray.put(obj)
                }
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("javascript:onVodListLoaded('${escapeJs(jsonArray.toString())}')", null)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @JavascriptInterface
    fun getRecentMovies() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val dao = AppDatabase.getDatabase(activity.applicationContext).iptvDao()
                val movies = dao.getRecentMovies().first()
                val jsonArray = JSONArray()
                movies.forEach { m ->
                    val obj = JSONObject()
                    obj.put("streamId", m.streamId)
                    obj.put("name", m.name)
                    obj.put("streamIcon", m.streamIcon)
                    obj.put("rating", m.rating)
                    obj.put("containerExtension", m.containerExtension)
                    jsonArray.put(obj)
                }
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("javascript:onRecentMoviesLoaded('${escapeJs(jsonArray.toString())}')", null)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @JavascriptInterface
    fun getRecentSeries() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val dao = AppDatabase.getDatabase(activity.applicationContext).iptvDao()
                val series = dao.getRecentSeries().first()
                val jsonArray = JSONArray()
                series.forEach { s ->
                    val obj = JSONObject()
                    obj.put("seriesId", s.seriesId)
                    obj.put("name", s.name)
                    obj.put("cover", s.cover)
                    obj.put("rating", s.rating)
                    jsonArray.put(obj)
                }
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("javascript:onRecentSeriesLoaded('${escapeJs(jsonArray.toString())}')", null)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }


    @JavascriptInterface
    fun getSeriesCategories() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val dao = AppDatabase.getDatabase(activity.applicationContext).iptvDao()
                val categories = dao.getCategoriesByType("series").first()
                val jsonArray = JSONArray()
                categories.forEach { c -> 
                    val obj = JSONObject()
                    obj.put("categoryId", c.categoryId)
                    obj.put("categoryName", c.categoryName)
                    jsonArray.put(obj)
                }
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("javascript:onSeriesCategoriesLoaded('${escapeJs(jsonArray.toString())}')", null)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @JavascriptInterface
    fun getSeriesList(categoryId: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val dao = AppDatabase.getDatabase(activity.applicationContext).iptvDao()
                val series = dao.getSeriesByCategory(categoryId).first()
                val jsonArray = JSONArray()
                // Mesma regra dos filmes: mais recentes no topo
                val sortedList = series.sortedWith(
                    compareByDescending<com.black.pro.data.local.entity.SeriesEntity> { it.added }
                        .thenBy { it.name.trim().lowercase() }
                )
                sortedList.forEach { s ->
                    val obj = JSONObject()
                    obj.put("seriesId", s.seriesId)
                    obj.put("name", s.name)
                    obj.put("cover", s.cover)
                    obj.put("rating", s.rating)
                    jsonArray.put(obj)
                }
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("javascript:onSeriesListLoaded('${escapeJs(jsonArray.toString())}')", null)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @JavascriptInterface
    fun getEpg(streamId: Int) {
        val u = sessionManager.getUsername() ?: return
        val p = sessionManager.getPassword() ?: return
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val epgList = NetworkModule.iptvService.getShortEpg(u, p, streamId = streamId)
                val jsonArray = JSONArray()
                epgList.epgListings.forEach { epg ->
                    val obj = JSONObject()
                    obj.put("title", epg.title)
                    obj.put("description", epg.description)
                    obj.put("start", epg.start)
                    obj.put("end", epg.end)
                    // Alguns provedores deixam start/end vazios ou num formato
                    // inesperado; os timestamps são o plano B do lado do JS.
                    obj.put("startTimestamp", epg.startTimestamp ?: "")
                    obj.put("endTimestamp", epg.endTimestamp ?: "")
                    jsonArray.put(obj)
                }
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("javascript:onEpgLoaded('${escapeJs(jsonArray.toString())}')", null)
                }
            } catch (e: Exception) { 
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("javascript:onEpgLoaded('[]')", null)
                }
            }
        }
    }

    @JavascriptInterface
    fun searchContent(query: String) {
        CoroutineScope(Dispatchers.IO).launch {
            val cleanQuery = query.trim()
            if (cleanQuery.isEmpty()) {
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("javascript:onSearchResultsLoaded('[]')", null)
                }
                return@launch
            }

            val jsonArray = JSONArray()
            try {
                // Busca direto no banco: o catálogo completo não fica em memória.
                val dao = AppDatabase.getDatabase(activity.applicationContext).iptvDao()

                dao.searchMovies(cleanQuery).forEach { m ->
                    val obj = JSONObject()
                    obj.put("id", m.streamId)
                    obj.put("name", m.name)
                    obj.put("streamIcon", m.streamIcon)
                    obj.put("rating", m.rating)
                    obj.put("containerExtension", m.containerExtension)
                    obj.put("type", "movie")
                    jsonArray.put(obj)
                }

                dao.searchSeries(cleanQuery).forEach { s ->
                    val obj = JSONObject()
                    obj.put("id", s.seriesId)
                    obj.put("name", s.name)
                    obj.put("streamIcon", s.cover)
                    obj.put("rating", s.rating)
                    obj.put("type", "series")
                    jsonArray.put(obj)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }

            withContext(Dispatchers.Main) {
                webView.evaluateJavascript("javascript:onSearchResultsLoaded('${escapeJs(jsonArray.toString())}')", null)
            }
        }
    }


    /**
     * Distingue TV de celular/tablet.
     *
     * O teclado virtual da interface só faz sentido na TV, onde há apenas o
     * D-pad. No celular ele atrapalha: o aparelho já tem teclado próprio.
     *
     * Duas checagens porque nenhuma cobre tudo: UI_MODE_TYPE_TELEVISION falha
     * em algumas TV boxes que se declaram como celular, e FEATURE_LEANBACK
     * falha em TVs sem a interface Leanback instalada.
     */
    @JavascriptInterface
    fun isTv(): Boolean {
        return try {
            val modo = (activity.getSystemService(Context.UI_MODE_SERVICE) as? UiModeManager)
                ?.currentModeType
            modo == Configuration.UI_MODE_TYPE_TELEVISION ||
                activity.packageManager.hasSystemFeature(PackageManager.FEATURE_LEANBACK)
        } catch (e: Exception) {
            // Na dúvida assume TV: é o alvo principal do app, e lá o teclado
            // virtual é o único jeito de digitar.
            true
        }
    }

    /**
     * Baixa o APK da URL e dispara o instalador do sistema. O progresso e o
     * resultado voltam ao JS por callbacks (onUpdateProgress/onUpdateError).
     *
     * A URL precisa ser HTTPS — o download valida o certificado normalmente
     * (diferente da WebView, que ignora SSL): instalar um APK vindo de conexão
     * adulterada seria grave.
     */
    @JavascriptInterface
    fun baixarEInstalarApk(url: String) {
        if (!url.startsWith("https://")) {
            webView.evaluateJavascript("javascript:onUpdateError('Link de atualização inválido.')", null)
            return
        }
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val dir = File(activity.cacheDir, "updates").apply { mkdirs() }
                // Nome novo a cada baixada, e limpa os antigos para não acumular
                dir.listFiles()?.forEach { it.delete() }
                val apk = File(dir, "update-${System.currentTimeMillis()}.apk")

                var conn = URL(url).openConnection() as HttpURLConnection
                conn.instanceFollowRedirects = true
                conn.connectTimeout = 20000
                conn.readTimeout = 20000
                conn.connect()

                // GitHub Releases redireciona para o CDN; segue manualmente se preciso
                var redirs = 0
                while (conn.responseCode in 300..399 && redirs < 5) {
                    val next = conn.getHeaderField("Location") ?: break
                    conn.disconnect()
                    conn = URL(next).openConnection() as HttpURLConnection
                    conn.connectTimeout = 20000
                    conn.readTimeout = 20000
                    conn.connect()
                    redirs++
                }

                if (conn.responseCode !in 200..299) {
                    throw Exception("HTTP ${conn.responseCode}")
                }

                val total = conn.contentLength.toLong()
                conn.inputStream.use { input ->
                    apk.outputStream().use { output ->
                        val buffer = ByteArray(64 * 1024)
                        var lidos = 0L
                        var n: Int
                        var ultimoPct = -1
                        while (input.read(buffer).also { n = it } != -1) {
                            output.write(buffer, 0, n)
                            lidos += n
                            if (total > 0) {
                                val pct = (lidos * 100 / total).toInt()
                                if (pct != ultimoPct) {
                                    ultimoPct = pct
                                    withContext(Dispatchers.Main) {
                                        webView.evaluateJavascript("javascript:onUpdateProgress($pct)", null)
                                    }
                                }
                            }
                        }
                    }
                }
                conn.disconnect()

                val uri = FileProvider.getUriForFile(
                    activity, "${activity.packageName}.fileprovider", apk
                )
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, "application/vnd.android.package-archive")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                withContext(Dispatchers.Main) {
                    activity.startActivity(intent)
                }
            } catch (e: Exception) {
                e.printStackTrace()
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript(
                        "javascript:onUpdateError('${escapeJs(e.message ?: "Falha no download")}')", null)
                }
            }
        }
    }

    @JavascriptInterface
    fun getAppVersion(): String {
        return try {
            val pInfo = activity.packageManager.getPackageInfo(activity.packageName, 0)
            pInfo.versionName ?: "1.0.0"
        } catch (e: Exception) {
            "1.0.0"
        }
    }

    @JavascriptInterface
    fun exitApp() {
        activity.runOnUiThread {
            activity.finishAndRemoveTask()
            System.exit(0)
        }
    }

    /**
     * Alterna o item nos favoritos. Espera {id, titulo, posterPath, tipo} em JSON.
     * Retorna true se o item passou a ser favorito, false se foi removido (ou em erro),
     * para o JS atualizar o estado do botão sem precisar de outra chamada.
     */
    @JavascriptInterface
    fun addFavorite(json: String): Boolean {
        return try {
            val o = JSONObject(json)
            val id = o.optInt("id")
            if (id == 0) return false
            // "live" entrou junto com os favoritos de canal; o padrão segue "movie"
            // para qualquer valor desconhecido.
            val tipoRecebido = o.optString("tipo")
            val item = FavoritoItem(
                id = id,
                titulo = o.optString("titulo"),
                posterPath = o.optString("posterPath").takeIf { it.isNotBlank() },
                tipo = if (tipoRecebido in setOf("series", "live")) tipoRecebido else "movie"
            )
            val ctx = activity.applicationContext
            FavoritosManager.toggle(ctx, item)
            FavoritosManager.isFavorito(ctx, item.id, item.tipo)
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    @JavascriptInterface
    fun isFavorite(id: Int, tipo: String): Boolean {
        return FavoritosManager.isFavorito(activity.applicationContext, id, tipo)
    }

    /**
     * Canais favoritos, no mesmo formato de getLiveChannels — assim a categoria
     * FAVORITOS reaproveita o onLiveChannelsLoaded que já existe, sem precisar
     * de outro renderizador na tela de TV ao vivo.
     */
    @JavascriptInterface
    fun getFavoriteChannels() {
        CoroutineScope(Dispatchers.IO).launch {
            val jsonArray = JSONArray()
            try {
                FavoritosManager.getByTipo(activity.applicationContext, "live")
                    .sortedBy { it.titulo.trim().lowercase() }
                    .forEach { fav ->
                        val obj = JSONObject()
                        obj.put("streamId", fav.id)
                        obj.put("name", fav.titulo)
                        obj.put("icon", fav.posterPath ?: "")
                        jsonArray.put(obj)
                    }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            withContext(Dispatchers.Main) {
                webView.evaluateJavascript("javascript:onLiveChannelsLoaded('${escapeJs(jsonArray.toString())}')", null)
            }
        }
    }

    @JavascriptInterface
    fun logout() {
        // Desconecta o acesso: limpa a sessão criptografada (usuário/senha) no dispositivo
        sessionManager.logout()
    }
}
