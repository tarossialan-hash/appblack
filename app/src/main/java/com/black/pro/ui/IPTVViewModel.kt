package com.black.pro.ui

import android.app.Application
import android.widget.Toast
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.black.pro.data.local.AppDatabase
import com.black.pro.data.local.entity.*
import com.black.pro.data.model.*
import com.black.pro.data.remote.NetworkModule
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class IPTVViewModel(application: Application) : AndroidViewModel(application) {
    private val service = NetworkModule.iptvService
    private val tmdbService = NetworkModule.tmdbService
    private val dao = AppDatabase.getDatabase(application).iptvDao()
    private val TMDB_API_KEY = NetworkModule.TMDB_API_KEY

    /** Destaques da Home. Único estado que a WebView lê (via WebAppInterface.getBannerItems). */
    var bannerItems: List<TmdbBannerItem> = emptyList()
        private set

    /** Cache do mapa id->nome de gênero do TMDB, para não repetir a chamada a cada sync. */
    private var movieGenres: Map<Int, String> = emptyMap()

    fun syncWithServer(
        username: String,
        password: String,
        isSilent: Boolean = false,
        onProgress: (Float, String) -> Unit = { _, _ -> },
        onError: (String) -> Unit = {},
        onComplete: () -> Unit = {}
    ) {
        viewModelScope.launch {
            try {
                // Etapa 1: canais e categorias ao vivo (25%)
                onProgress(0.05f, "Sincronizando canais...")
                val liveCats = service.getLiveCategories(username, password)
                dao.insertCategories(liveCats.map { CategoryEntity(it.categoryId, it.categoryName, it.parentId, "live") })
                onProgress(0.15f, "Sincronizando canais...")
                val streams = service.getLiveStreams(username, password)
                dao.insertLiveStreams(streams.map { LiveStreamEntity(it.streamId, it.num, it.name, it.streamType, it.streamIcon, it.categoryId) })
                onProgress(0.25f, "Sincronizando canais...")

                // Etapa 2: filmes e categorias VOD (50%)
                onProgress(0.30f, "Sincronizando filmes...")
                val movieCats = service.getVodCategories(username, password)
                dao.insertCategories(movieCats.map { CategoryEntity(it.categoryId, it.categoryName, it.parentId, "movie") })
                onProgress(0.40f, "Sincronizando filmes...")
                val moviesList = service.getVodStreams(username, password)
                // categoryId compõe a chave primária, então não pode ser nulo
                dao.insertMovies(moviesList
                    .filter { !it.categoryId.isNullOrBlank() }
                    .map { MovieEntity(it.streamId, it.num, it.name, it.streamIcon, it.rating, it.categoryId!!, it.containerExtension, it.added?.toLongOrNull() ?: 0L) })
                onProgress(0.50f, "Sincronizando filmes...")

                // Etapa 3: séries (75%)
                onProgress(0.55f, "Sincronizando séries...")
                val seriesCats = service.getSeriesCategories(username, password)
                dao.insertCategories(seriesCats.map { CategoryEntity(it.categoryId, it.categoryName, it.parentId, "series") })
                onProgress(0.65f, "Sincronizando séries...")
                val seriesList = service.getSeries(username, password)
                dao.insertSeries(seriesList
                    .filter { !it.categoryId.isNullOrBlank() }
                    .map { SeriesEntity(it.seriesId, it.num, it.name, it.cover, it.rating, it.categoryId!!, it.lastModified?.toLongOrNull() ?: 0L) })
                onProgress(0.75f, "Sincronizando séries...")

                // Etapa 4: destaques da Home (100%)
                onProgress(0.85f, "Organizando sua Home...")
                fetchBannerData()
                onProgress(1.0f, "Concluído!")
                if (!isSilent) delay(1000)
                onComplete()
            } catch (e: Exception) {
                Toast.makeText(getApplication(), "Falha na sincronização. Tente novamente.", Toast.LENGTH_SHORT).show()
                onError(e.message ?: "Erro desconhecido")
            }
        }
    }

    // Escolhe o logo preferindo português (pt-BR/pt), depois inglês, por último qualquer um.
    // Dentro de cada idioma, usa o mais bem avaliado.
    private fun pickLogoPtBr(logos: List<TmdbImage>): String? {
        if (logos.isEmpty()) return null
        val best = { lang: String ->
            logos.filter { it.language?.lowercase() == lang }.maxByOrNull { it.voteAverage }
        }
        return (best("pt-br") ?: best("pt") ?: best("en")
            ?: logos.maxByOrNull { it.voteAverage } ?: logos.first()).filePath
    }

    // Converte minutos em "1h 35m" (ou "45m" quando menos de 1 hora)
    private fun formatRuntime(minutes: Int): String {
        val h = minutes / 60
        val m = minutes % 60
        return if (h > 0) "${h}h ${m}m" else "${m}m"
    }

    // Fase 2: busca duração, país, gênero oficial e faixa etária apenas dos itens que vão ao ar
    private suspend fun enrichBannerItems(items: List<TmdbBannerItem>): List<TmdbBannerItem> = coroutineScope {
        items.map { item ->
            async {
                try {
                    var runtimeStr: String? = null
                    var countryStr = ""
                    var genreNamesStr = item.genreNames
                    var ageRating = item.ageRating

                    if (item.mediaType == "tv") {
                        val det = tmdbService.getTvDetails(item.id, TMDB_API_KEY)
                        val mins = det.episodeRunTime?.firstOrNull() ?: 0
                        if (mins > 0) runtimeStr = formatRuntime(mins)
                        countryStr = det.originCountry?.firstOrNull() ?: ""
                        det.genres?.take(2)?.joinToString(", ") { it.name }
                            ?.takeIf { it.isNotBlank() }?.let { genreNamesStr = it }
                        if (ageRating == null) {
                            try {
                                val ratings = tmdbService.getTvContentRatings(item.id, TMDB_API_KEY)
                                ageRating = ratings.results.find { it.countryCode == "BR" }?.rating
                                    ?: ratings.results.find { it.countryCode == "US" }?.rating
                            } catch (_: Exception) {}
                        }
                    } else {
                        val det = tmdbService.getMovieDetails(item.id, TMDB_API_KEY)
                        val mins = det.runtime ?: 0
                        if (mins > 0) runtimeStr = formatRuntime(mins)
                        countryStr = det.productionCountries?.firstOrNull()?.code ?: ""
                        det.genres?.take(2)?.joinToString(", ") { it.name }
                            ?.takeIf { it.isNotBlank() }?.let { genreNamesStr = it }
                        if (ageRating == null) {
                            try {
                                val releases = tmdbService.getMovieReleaseDates(item.id, TMDB_API_KEY)
                                ageRating = releases.results.find { it.countryCode == "BR" }?.releaseDates?.firstOrNull()?.certification
                                    ?: releases.results.find { it.countryCode == "US" }?.releaseDates?.find { it.certification.isNotEmpty() }?.certification
                            } catch (_: Exception) {}
                        }
                    }

                    item.copy(
                        runtime = runtimeStr,
                        ageRating = ageRating,
                        country = countryStr,
                        genreNames = genreNamesStr
                    )
                } catch (_: Exception) {
                    item // mantém o básico se falhar
                }
            }
        }.awaitAll()
    }

    private suspend fun fetchBannerData() {
        try {
            if (movieGenres.isEmpty()) {
                val genreRes = tmdbService.getMovieGenres(TMDB_API_KEY)
                movieGenres = genreRes.genres.associate { it.id to it.name }
            }

            val recentMoviesList = dao.getRecentMovies().first().take(30)
            val recentSeriesList = dao.getRecentSeries().first().take(30)

            val interleaved = mutableListOf<Any>()
            val maxLength = maxOf(recentMoviesList.size, recentSeriesList.size)
            for (i in 0 until maxLength) {
                if (i < recentMoviesList.size) interleaved.add(recentMoviesList[i])
                if (i < recentSeriesList.size) interleaved.add(recentSeriesList[i])
            }

            val results = coroutineScope {
                interleaved.take(30).map { item ->
                    async {
                        val originalName = if (item is MovieEntity) item.name else (item as SeriesEntity).name
                        val mediaType = if (item is MovieEntity) "movie" else "tv"

                        val cleanTitle = originalName
                            .replace(Regex("(?i)\\[LEG]|\\[DUB]|\\(Legendado\\)|\\(Dublado\\)|H.264|H.265|4K|1080P|720P|WEB-DL|BLURAY"), "")
                            .replace(Regex("\\d{4}"), "")
                            .trim()

                        if (cleanTitle.isBlank()) return@async null

                        try {
                            val searchRes = tmdbService.searchMulti(TMDB_API_KEY, cleanTitle)
                            val result = searchRes.results.firstOrNull {
                                it.mediaType == "movie" || it.mediaType == "tv"
                            } ?: return@async null

                            val id = result.id
                            val backdrop = result.backdropPath ?: return@async null

                            val images = if (result.mediaType == "tv") tmdbService.getTvImages(id, TMDB_API_KEY) else tmdbService.getMovieImages(id, TMDB_API_KEY)
                            val logo = pickLogoPtBr(images.logos)

                            // Fase 1 leve: só o essencial. Gênero vem do mapa local (sem chamada extra).
                            TmdbBannerItem(
                                id = id,
                                title = result.title ?: result.name ?: cleanTitle,
                                overview = result.overview ?: "",
                                backdropPath = backdrop,
                                logoPath = logo,
                                releaseYear = (result.releaseDate ?: result.firstAirDate ?: "").take(4),
                                voteAverage = result.voteAverage,
                                genreIds = result.genreIds ?: emptyList(),
                                mediaType = result.mediaType ?: mediaType,
                                ageRating = if (result.adult == true) "18+" else null,
                                releaseDate = result.releaseDate ?: result.firstAirDate ?: "",
                                genreNames = (result.genreIds ?: emptyList())
                                    .mapNotNull { movieGenres[it] }
                                    .take(2)
                                    .joinToString(", ")
                            )
                        } catch (_: Exception) {
                            null
                        }
                    }
                }.awaitAll()
            }

            // Já exibe o banner com o básico (rápido)
            val shortlist = results.filterNotNull().distinctBy { it.id }.take(10)
            bannerItems = shortlist

            // Fase 2: enriquece SÓ os 10 do banner (duração, país, gênero oficial e faixa etária)
            bannerItems = enrichBannerItems(shortlist)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
