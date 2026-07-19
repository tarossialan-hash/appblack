package com.black.pro

import android.app.Activity
import android.webkit.JavascriptInterface
import android.webkit.WebView
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
import android.content.Intent
import android.os.Build
import androidx.core.content.FileProvider
import java.io.File
import com.google.gson.Gson

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
    fun getBannerItems() {
        CoroutineScope(Dispatchers.Main).launch {
            val jsonArray = JSONArray()
            viewModel.bannerItems.forEach { item ->
                val obj = JSONObject()
                obj.put("id", item.id)
                obj.put("title", item.title)
                obj.put("overview", item.overview)
                // Adiciona o prefixo do TMDB para facilitar
                obj.put("backdropUrl", if (item.backdropPath.isNotEmpty()) "https://image.tmdb.org/t/p/original${item.backdropPath}" else "")
                obj.put("logoUrl", if (item.logoPath != null) "https://image.tmdb.org/t/p/w500${item.logoPath}" else "")
                obj.put("releaseYear", item.releaseYear)
                obj.put("voteAverage", item.voteAverage)
                obj.put("ageRating", item.ageRating ?: "")
                jsonArray.put(obj)
            }
            webView.evaluateJavascript("javascript:onBannerItemsLoaded('${escapeJs(jsonArray.toString())}')", null)
        }
    }

    @JavascriptInterface
    fun loadCategory(categoryType: String) {
        sessionManager.getUsername() ?: return
        sessionManager.getPassword() ?: return

        CoroutineScope(Dispatchers.Main).launch {
            when (categoryType) {
                "filmes" -> {
                    // Converter a lista de filmes do ViewModel para JSON
                    val jsonArray = JSONArray()
                    viewModel.movies.forEach { movie ->
                        val obj = JSONObject()
                        obj.put("id", movie.streamId)
                        obj.put("name", movie.name)
                        jsonArray.put(obj)
                    }
                    webView.evaluateJavascript("javascript:renderizarItens('${escapeJs(jsonArray.toString())}')", null)
                }
                "series" -> {
                    val jsonArray = JSONArray()
                    viewModel.series.forEach { s ->
                        val obj = JSONObject()
                        obj.put("id", s.seriesId)
                        obj.put("name", s.name)
                        jsonArray.put(obj)
                    }
                    webView.evaluateJavascript("javascript:renderizarItens('${escapeJs(jsonArray.toString())}')", null)
                }
                "tv" -> {
                    val jsonArray = JSONArray()
                    viewModel.liveStreams.forEach { ch ->
                        val obj = JSONObject()
                        obj.put("id", ch.streamId)
                        obj.put("name", ch.name)
                        jsonArray.put(obj)
                    }
                    webView.evaluateJavascript("javascript:renderizarItens('${escapeJs(jsonArray.toString())}')", null)
                }
            }
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

    @JavascriptInterface
    fun getStreamUrl(streamId: Int): String {
        val u = sessionManager.getUsername() ?: return ""
        val p = sessionManager.getPassword() ?: return ""
        return "http://bkpac.cc/live/$u/$p/$streamId.ts"
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
                val sortedList = movies.sortedBy { it.name.trim().lowercase() }
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
                val sortedList = series.sortedBy { it.name.trim().lowercase() }
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
        CoroutineScope(Dispatchers.Default).launch {
            val cleanQuery = query.trim().lowercase()
            if (cleanQuery.isEmpty()) {
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("javascript:onSearchResultsLoaded('[]')", null)
                }
                return@launch
            }

            val matchedMovies = viewModel.movies.filter { 
                it.name.lowercase().contains(cleanQuery)
            }.take(50)

            val matchedSeries = viewModel.series.filter { 
                it.name.lowercase().contains(cleanQuery)
            }.take(50)

            val jsonArray = JSONArray()
            
            matchedMovies.forEach { m ->
                val obj = JSONObject()
                obj.put("id", m.streamId)
                obj.put("name", m.name)
                obj.put("streamIcon", m.streamIcon)
                obj.put("rating", m.rating)
                obj.put("type", "movie")
                jsonArray.put(obj)
            }

            matchedSeries.forEach { s ->
                val obj = JSONObject()
                obj.put("id", s.seriesId)
                obj.put("name", s.name)
                obj.put("streamIcon", s.cover)
                obj.put("rating", s.rating)
                obj.put("type", "series")
                jsonArray.put(obj)
            }

            withContext(Dispatchers.Main) {
                webView.evaluateJavascript("javascript:onSearchResultsLoaded('${escapeJs(jsonArray.toString())}')", null)
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
}
