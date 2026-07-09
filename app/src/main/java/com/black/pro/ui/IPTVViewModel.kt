package com.black.pro.ui

import android.app.Application
import android.widget.Toast
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.black.pro.data.local.AppDatabase
import com.black.pro.data.local.entity.*
import com.black.pro.data.model.*
import com.black.pro.data.remote.NetworkModule
import com.black.pro.util.SessionManager
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

    var categories by mutableStateOf<List<Category>>(emptyList())
        private set

    var liveStreams by mutableStateOf<List<LiveStream>>(emptyList())
        private set

    var movies by mutableStateOf<List<Movie>>(emptyList())
        private set

    var series by mutableStateOf<List<Series>>(emptyList())
        private set

    var recentMovies by mutableStateOf<List<Movie>>(emptyList())
        private set

    var recentSeries by mutableStateOf<List<Series>>(emptyList())
        private set

    var bannerItems by mutableStateOf<List<TmdbBannerItem>>(emptyList())
        private set

    var movieGenres by mutableStateOf<Map<Int, String>>(emptyMap())
        private set

    var playingLiveChannel by mutableStateOf<LiveStream?>(null)
    var focusedLiveChannel by mutableStateOf<LiveStream?>(null)
    var selectedCategory by mutableStateOf<Category?>(null)
    var selectedMovieCategory by mutableStateOf<Category?>(null)
    var selectedSeriesCategory by mutableStateOf<Category?>(null)
    var channelEpg by mutableStateOf<List<EpgListing>>(emptyList())
        private set

    var isSyncing by mutableStateOf(false)
        private set

    var showSyncOverlay by mutableStateOf(false)
        private set

    var syncProgress by mutableStateOf(0f)
        private set

    var syncStatus by mutableStateOf("")
        private set

    var selectedMovieDetails by mutableStateOf<TmdbMovieDetails?>(null)
    var selectedTvDetails by mutableStateOf<TmdbTvDetails?>(null)
    var selectedSeasonEpisodes by mutableStateOf<List<TmdbEpisode>>(emptyList())
    var iptvEpisodes by mutableStateOf<Map<String, List<IptvEpisode>>>(emptyMap())
    var isFetchingDetails by mutableStateOf(false)
    var isFetchingEpisodes by mutableStateOf(false)

    fun fetchDetails(name: String, type: String, username: String = "", password: String = "", seriesId: Int = 0) {
        viewModelScope.launch {
            isFetchingDetails = true
            selectedMovieDetails = null
            selectedTvDetails = null
            selectedSeasonEpisodes = emptyList()
            iptvEpisodes = emptyMap()
            
            try {
                if (type == "series" && seriesId != 0) {
                    val info = service.getSeriesInfo(username, password, seriesId = seriesId)
                    iptvEpisodes = info.episodes ?: emptyMap()
                }

                val cleanTitle = name
                    .replace(Regex("(?i)\\[LEG]|\\[DUB]|\\(Legendado\\)|\\(Dublado\\)|H.264|H.265|4K|1080P|720P|WEB-DL|BLURAY"), "")
                    .replace(Regex("\\d{4}"), "")
                    .trim()

                val searchRes = tmdbService.searchMulti(TMDB_API_KEY, cleanTitle)
                val result = searchRes.results.firstOrNull { 
                    if (type == "movie") it.mediaType == "movie" else it.mediaType == "tv" 
                }
                
                if (result != null) {
                    if (type == "movie") {
                        val movie = tmdbService.getMovieDetails(result.id, TMDB_API_KEY)
                        val images = tmdbService.getMovieImages(result.id, TMDB_API_KEY)
                        movie.logoPath = images.logos.firstOrNull()?.filePath
                        selectedMovieDetails = movie
                    } else {
                        val tv = tmdbService.getTvDetails(result.id, TMDB_API_KEY)
                        val images = tmdbService.getTvImages(result.id, TMDB_API_KEY)
                        tv.logoPath = images.logos.firstOrNull()?.filePath
                        selectedTvDetails = tv
                        // Fetch first season episodes by default
                        val firstSeason = tv.seasons?.firstOrNull { it.seasonNumber > 0 } ?: tv.seasons?.firstOrNull()
                        if (firstSeason != null) {
                            fetchSeasonEpisodes(tv.id, firstSeason.seasonNumber)
                        }
                    }
                }
            } catch (_: Exception) {
            } finally {
                isFetchingDetails = false
            }
        }
    }

    fun fetchSeasonEpisodes(tvId: Int, seasonNumber: Int) {
        viewModelScope.launch {
            isFetchingEpisodes = true
            try {
                val details = tmdbService.getTvSeasonDetails(tvId, seasonNumber, TMDB_API_KEY)
                selectedSeasonEpisodes = details.episodes
            } catch (_: Exception) {
            } finally {
                isFetchingEpisodes = false
            }
        }
    }

    fun resetLiveTvState() {
        playingLiveChannel = null
        focusedLiveChannel = null
        selectedCategory = null
        liveStreams = emptyList()
        channelEpg = emptyList()
    }

    fun fetchEpg(streamId: Int, username: String, password: String) {
        viewModelScope.launch {
            try {
                val response = service.getShortEpg(username, password, streamId = streamId)
                channelEpg = response.epgListings
            } catch (e: Exception) {
                channelEpg = emptyList()
            }
        }
    }

    fun logout(sessionManager: SessionManager, onLoggedOut: () -> Unit) {
        viewModelScope.launch {
            sessionManager.logout()
            dao.clearAll()
            categories = emptyList()
            liveStreams = emptyList()
            movies = emptyList()
            series = emptyList()
            playingLiveChannel = null
            selectedCategory = null
            onLoggedOut()
        }
    }

    fun syncWithServer(username: String, password: String, isSilent: Boolean = false, onProgress: (Float, String) -> Unit = { _, _ -> }, onError: (String) -> Unit = {}, onComplete: () -> Unit = {}) {
        viewModelScope.launch {
            isSyncing = true
            showSyncOverlay = !isSilent
            syncProgress = 0f
            try {
                // Etapa 1: Canais e Categorias Live (25%)
                syncStatus = "Sincronizando canais..."
                syncProgress = 0.05f
                onProgress(syncProgress, syncStatus)
                val liveCats = service.getLiveCategories(username, password)
                dao.insertCategories(liveCats.map { CategoryEntity(it.categoryId, it.categoryName, it.parentId, "live") })
                syncProgress = 0.15f
                onProgress(syncProgress, syncStatus)
                val streams = service.getLiveStreams(username, password)
                dao.insertLiveStreams(streams.map { LiveStreamEntity(it.streamId, it.num, it.name, it.streamType, it.streamIcon, it.categoryId) })
                syncProgress = 0.25f
                onProgress(syncProgress, syncStatus)
                
                // Etapa 2: EPG / Filmes e Categorias VOD (50%)
                syncStatus = "Sincronizando filmes..."
                syncProgress = 0.30f
                onProgress(syncProgress, syncStatus)
                val movieCats = service.getVodCategories(username, password)
                dao.insertCategories(movieCats.map { CategoryEntity(it.categoryId, it.categoryName, it.parentId, "movie") })
                syncProgress = 0.40f
                onProgress(syncProgress, syncStatus)
                val moviesList = service.getVodStreams(username, password)
                dao.insertMovies(moviesList.map { MovieEntity(it.streamId, it.num, it.name, it.streamIcon, it.rating, it.categoryId, it.containerExtension) })
                syncProgress = 0.50f
                onProgress(syncProgress, syncStatus)
                
                // Etapa 3: Séries e Episódios (75%)
                syncStatus = "Sincronizando séries..."
                syncProgress = 0.55f
                onProgress(syncProgress, syncStatus)
                val seriesCats = service.getSeriesCategories(username, password)
                dao.insertCategories(seriesCats.map { CategoryEntity(it.categoryId, it.categoryName, it.parentId, "series") })
                syncProgress = 0.65f
                onProgress(syncProgress, syncStatus)
                val seriesList = service.getSeries(username, password)
                dao.insertSeries(seriesList.map { SeriesEntity(it.seriesId, it.num, it.name, it.cover, it.rating, it.categoryId) })
                syncProgress = 0.75f
                onProgress(syncProgress, syncStatus)
                
                // Etapa 4: Dados da Home e Banner (100%)
                syncStatus = "Organizando sua Home..."
                syncProgress = 0.85f
                onProgress(syncProgress, syncStatus)
                fetchHomeData {
                    viewModelScope.launch {
                        syncProgress = 1.0f
                        syncStatus = "Concluído!"
                        onProgress(syncProgress, syncStatus)
                        if (!isSilent) {
                            delay(1000)
                        }
                        onComplete()
                        isSyncing = false
                        showSyncOverlay = false
                    }
                }
            } catch (e: Exception) {
                isSyncing = false
                showSyncOverlay = false
                Toast.makeText(getApplication(), "Falha na sincronização. Tente novamente.", Toast.LENGTH_SHORT).show()
                onError(e.message ?: "Erro desconhecido")
            }
        }
    }

    fun fetchContent(type: String, categoryId: String, username: String, password: String) {
        viewModelScope.launch {
            try {
                if (categoryId == "favorites") {
                    val context = getApplication<Application>().applicationContext
                    val favs = com.black.pro.util.FavoritosManager.getByTipo(context, type)
                    if (type == "movie") {
                        movies = favs.map { Movie(0, it.titulo, it.id, it.posterPath, null, "favorites", "mp4") }
                    } else {
                        series = favs.map { Series(0, it.titulo, it.id, it.posterPath, null, "favorites") }
                    }
                    return@launch
                }
                
                when (type) {
                    "live" -> {
                        val cached = dao.getLiveStreamsByCategory(categoryId).first()
                        val list = if (cached.isNotEmpty()) {
                            cached.map { LiveStream(it.num, it.name, it.streamType, it.streamId, it.streamIcon, it.categoryId) }
                        } else {
                            service.getLiveStreams(username, password, categoryId = categoryId)
                        }
                        // Ajuste 1: Ordenar canais alfabeticamente
                        liveStreams = list.sortedBy { it.name.trim().lowercase() }
                    }
                    "movie" -> {
                        val cached = dao.getMoviesByCategory(categoryId).first()
                        val list = if (cached.isNotEmpty()) {
                            cached.map { Movie(it.num, it.name, it.streamId, it.streamIcon, it.rating, it.categoryId, it.containerExtension) }
                        } else {
                            service.getVodStreams(username, password, categoryId = categoryId)
                        }
                        // Sort by ID descending (Latest first)
                        movies = list.sortedByDescending { it.streamId }
                    }
                    "series" -> {
                        val cached = dao.getSeriesByCategory(categoryId).first()
                        val list = if (cached.isNotEmpty()) {
                            cached.map { Series(it.num, it.name, it.seriesId, it.cover, it.rating, it.categoryId) }
                        } else {
                            service.getSeries(username, password, categoryId = categoryId)
                        }
                        // Sort by ID descending (Latest first)
                        series = list.sortedByDescending { it.seriesId }
                    }
                }
            } catch (_: Exception) { }
        }
    }

    fun fetchCategories(type: String, username: String, password: String) {
        viewModelScope.launch {
            try {
                val cached = dao.getCategoriesByType(type).first()
                val list = if (cached.isNotEmpty()) {
                    cached.map { Category(it.categoryId, it.categoryName, it.parentId) }
                } else {
                    when (type) {
                        "live" -> service.getLiveCategories(username, password)
                        "movie" -> service.getVodCategories(username, password)
                        "series" -> service.getSeriesCategories(username, password)
                        else -> emptyList()
                    }
                }
                
                if (type == "movie" || type == "series") {
                    val favoritesCategory = Category("favorites", "Favoritos", 0)
                    categories = listOf(favoritesCategory) + list
                } else {
                    categories = list
                }
            } catch (_: Exception) { }
        }
    }

    fun fetchHomeData(onComplete: () -> Unit = {}) {
        viewModelScope.launch {
            fetchBannerData()
            launch {
                dao.getRecentMovies().collect { entities ->
                    recentMovies = entities.map { Movie(it.num, it.name, it.streamId, it.streamIcon, it.rating, it.categoryId, it.containerExtension) }
                }
            }
            launch {
                dao.getRecentSeries().collect { entities ->
                    recentSeries = entities.map { Series(it.num, it.name, it.seriesId, it.cover, it.rating, it.categoryId) }
                }
            }
            onComplete()
        }
    }

    private suspend fun fetchBannerData() {
        try {
            if (movieGenres.isEmpty()) {
                val genreRes = tmdbService.getMovieGenres(TMDB_API_KEY)
                movieGenres = genreRes.genres.associate { it.id to it.name }
            }

            val movieEntities = dao.getRecentMovies().first()
            val seriesEntities = dao.getRecentSeries().first()
            
            val recentMoviesList = movieEntities.take(30)
            val recentSeriesList = seriesEntities.take(30)

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
                            val logo = images.logos.firstOrNull()?.filePath
                            
                            // Fetch Age Rating
                            var ageRating: String? = if (result.adult == true) "18+" else null
                            if (ageRating == null) {
                                try {
                                    if (result.mediaType == "tv") {
                                        val ratings = tmdbService.getTvContentRatings(id, TMDB_API_KEY)
                                        ageRating = ratings.results.find { it.countryCode == "BR" }?.rating
                                            ?: ratings.results.find { it.countryCode == "US" }?.rating
                                    } else {
                                        val releases = tmdbService.getMovieReleaseDates(id, TMDB_API_KEY)
                                        ageRating = releases.results.find { it.countryCode == "BR" }?.releaseDates?.firstOrNull()?.certification
                                            ?: releases.results.find { it.countryCode == "US" }?.releaseDates?.find { it.certification.isNotEmpty() }?.certification
                                    }
                                } catch (_: Exception) {}
                            }

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
                                ageRating = ageRating
                            )
                        } catch (_: Exception) {
                            null
                        }
                    }
                }.awaitAll()
            }

            bannerItems = results.filterNotNull().distinctBy { it.id }.take(10)
        } catch (e: Exception) { 
            e.printStackTrace() 
        }
    }
}
