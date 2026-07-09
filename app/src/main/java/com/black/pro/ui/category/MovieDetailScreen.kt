package com.black.pro.ui.category

import android.util.Log
import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.black.pro.data.model.Movie
import com.black.pro.data.model.Series
import com.black.pro.data.model.TmdbEpisode
import com.black.pro.data.model.TmdbMovieDetails
import com.black.pro.data.model.TmdbTvDetails
import com.black.pro.util.FavoritoItem
import com.black.pro.util.FavoritosManager
import kotlinx.coroutines.delay

@Composable
fun MovieDetailScreen(
    movieDetails: TmdbMovieDetails? = null,
    tvDetails: TmdbTvDetails? = null,
    episodes: List<TmdbEpisode> = emptyList(),
    relatedMovies: List<Movie> = emptyList(),
    relatedSeries: List<Series> = emptyList(),
    onWatchClick: () -> Unit,
    onEpisodeClick: (TmdbEpisode) -> Unit = {},
    onSeasonSelect: (Int) -> Unit = {},
    onBack: () -> Unit
) {
    if (tvDetails != null) {
        SeriesDetailContent(tvDetails, episodes, onWatchClick, onEpisodeClick, onSeasonSelect, onBack)
    } else if (movieDetails != null) {
        MovieDetailContent(movieDetails, relatedMovies, onWatchClick, onBack)
    } else {
        Box(modifier = Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Color.White)
        }
    }
    
    BackHandler { onBack() }
}

@Composable
fun MovieDetailContent(
    movieDetails: TmdbMovieDetails,
    relatedMovies: List<Movie>,
    onWatchClick: () -> Unit,
    onBack: () -> Unit
) {
    val watchButtonFocusRequester = remember { FocusRequester() }
    val relatedFocusRequester = remember { FocusRequester() }
    val context = LocalContext.current
    var isFavorite by remember(movieDetails.id) { mutableStateOf(FavoritosManager.isFavorito(context, movieDetails.id, "movie")) }

    LaunchedEffect(Unit) {
        try { watchButtonFocusRequester.requestFocus() } catch (_: Exception) {}
    }

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF0A0A0A))) {
        if (movieDetails.backdropPath != null) {
            Box(modifier = Modifier.fillMaxWidth().height(400.dp)) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data("https://image.tmdb.org/t/p/w1280${movieDetails.backdropPath}")
                        .crossfade(true)
                        .build(),
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize().alpha(0.2f),
                    contentScale = ContentScale.FillWidth,
                    alignment = Alignment.TopCenter
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color(0xFF0A0A0A))
                            )
                        )
                )
            }
        }

        Column(modifier = Modifier.fillMaxSize().padding(horizontal = 48.dp, vertical = 24.dp)) {
            Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.weight(0.35f), contentAlignment = Alignment.Center) {
                    Surface(
                        modifier = Modifier
                            .size(width = 200.dp, height = 300.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .shadow(30.dp, RoundedCornerShape(12.dp)),
                        color = Color.DarkGray
                    ) {
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current)
                                .data("https://image.tmdb.org/t/p/w500${movieDetails.posterPath}")
                                .crossfade(true).build(),
                            contentDescription = null, 
                            modifier = Modifier.fillMaxSize(), 
                            contentScale = ContentScale.FillBounds
                        )
                    }
                }

                Box(modifier = Modifier.weight(0.65f), contentAlignment = Alignment.CenterStart) {
                    Surface(color = Color.Black.copy(alpha = 0.8f), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(top = 60.dp, start = 24.dp, end = 24.dp, bottom = 24.dp)) {
                            if (!movieDetails.logoPath.isNullOrEmpty()) {
                                AsyncImage(
                                    model = "https://image.tmdb.org/t/p/w500${movieDetails.logoPath}",
                                    contentDescription = movieDetails.title,
                                    modifier = Modifier.height(80.dp).widthIn(max = 350.dp),
                                    contentScale = ContentScale.Fit,
                                    alignment = Alignment.CenterStart
                                )
                            } else {
                                Text(text = movieDetails.title, color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            }
                            Text(text = movieDetails.originalTitle ?: "", color = Color(0xFFAAAAAA), fontSize = 15.sp)
                            Spacer(modifier = Modifier.height(20.dp))

                            Row(modifier = Modifier.width(200.dp), verticalAlignment = Alignment.CenterVertically) {
                                Button(
                                    onClick = onWatchClick, 
                                    colors = ButtonDefaults.buttonColors(containerColor = Color.White), 
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.weight(1f).height(48.dp).focusRequester(watchButtonFocusRequester).focusProperties { down = relatedFocusRequester }
                                ) {
                                    Icon(Icons.Default.PlayArrow, null, tint = Color.Black)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Assistir", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                }
                                
                                Spacer(modifier = Modifier.width(12.dp))
                                
                                val favInteractionSource = remember { MutableInteractionSource() }
                                val isFavFocused by favInteractionSource.collectIsFocusedAsState()
                                OutlinedButton(
                                    onClick = { 
                                        FavoritosManager.toggle(context, FavoritoItem(movieDetails.id, movieDetails.title, movieDetails.posterPath, "movie"))
                                        isFavorite = !isFavorite
                                    },
                                    interactionSource = favInteractionSource,
                                    border = BorderStroke(2.dp, if (isFavFocused) Color.White else Color.White.copy(alpha = 0.5f)),
                                    colors = ButtonDefaults.outlinedButtonColors(containerColor = if (isFavFocused) Color.White.copy(alpha = 0.2f) else Color.Transparent),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.size(48.dp).focusProperties { down = relatedFocusRequester }
                                ) {
                                    Icon(
                                        if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                        null,
                                        tint = if (isFavorite) Color(0xFFE53935) else Color.White
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(20.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                val year = (movieDetails.releaseDate ?: "").take(4)
                                val genres = movieDetails.genres?.joinToString(", ") { it.name } ?: ""
                                val h = movieDetails.runtime?.div(60) ?: 0
                                val m = movieDetails.runtime?.rem(60) ?: 0
                                val runtime = if (h > 0) "${h}h ${m}m" else "${m}m"

                                Icon(Icons.Default.DateRange, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Text(" $year   ", color = Color.White, fontSize = 15.sp)
                                Icon(Icons.Default.PlayArrow, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Text(" $genres   ", color = Color.White, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, false))
                                Icon(Icons.Default.Info, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Text(" $runtime   ", color = Color.White, fontSize = 15.sp)
                                Icon(Icons.Default.ThumbUp, null, tint = Color(0xFF4CAF50), modifier = Modifier.size(16.dp))
                            }

                            Spacer(modifier = Modifier.height(12.dp))
                            val cast = movieDetails.credits?.cast?.take(5)?.joinToString { it.name } ?: ""
                            val director = movieDetails.credits?.crew?.find { it.job == "Director" }?.name ?: ""
                            if (director.isNotEmpty()) Text(text = buildAnnotatedString { withStyle(SpanStyle(color = Color(0xFFAAAAAA))) { append("Direção: ") }; withStyle(SpanStyle(color = Color.White)) { append(director) } }, fontSize = 15.sp)
                            if (cast.isNotEmpty()) Text(text = buildAnnotatedString { withStyle(SpanStyle(color = Color(0xFFAAAAAA))) { append("Elenco: ") }; withStyle(SpanStyle(color = Color.White)) { append(cast) } }, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)

                            Spacer(modifier = Modifier.height(12.dp))
                            Text(text = movieDetails.overview, color = Color(0xFFEEEEEE), fontSize = 15.sp, lineHeight = 22.sp, maxLines = 4, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
            Text("RECENTEMENTE ADICIONADOS", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 12.dp))
            LazyRow(modifier = Modifier.fillMaxWidth().focusRequester(relatedFocusRequester), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                items(relatedMovies) { movie -> RelatedCard(movie.name, movie.streamIcon) }
            }
        }
    }
}

@Composable
fun SeriesDetailContent(
    tvDetails: TmdbTvDetails,
    episodes: List<TmdbEpisode>,
    onWatchClick: () -> Unit,
    onEpisodeClick: (TmdbEpisode) -> Unit,
    onSeasonSelect: (Int) -> Unit,
    onBack: () -> Unit
) {
    val seasonsFocusRequester = remember { FocusRequester() }
    val episodesFocusRequester = remember { FocusRequester() }
    var selectedSeasonNumber by remember(tvDetails.id) { mutableIntStateOf(tvDetails.seasons?.firstOrNull { it.seasonNumber > 0 }?.seasonNumber ?: 1) }

    val context = LocalContext.current

    LaunchedEffect(tvDetails.id) {
        try { seasonsFocusRequester.requestFocus() } catch (_: Exception) {}
    }

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF0A0A0A))) {
        Column(modifier = Modifier.fillMaxSize()) {
            // BANNER CONTAINER (Altura equilibrada)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(350.dp)
                    .background(Color(0xFF0A0A0A))
                    .clipToBounds()
            ) {
                // 1. BACKDROP POSITIONED ON THE RIGHT
                Row(modifier = Modifier.fillMaxSize()) {
                    Spacer(modifier = Modifier.weight(0.4f)) // Espaço vazio na esquerda
                    Box(modifier = Modifier.weight(0.6f).fillMaxHeight()) {
                        if (tvDetails.backdropPath != null) {
                            AsyncImage(
                                model = ImageRequest.Builder(LocalContext.current)
                                    .data("https://image.tmdb.org/t/p/w1280${tvDetails.backdropPath}")
                                    .crossfade(true).build(),
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize().alpha(0.35f),
                                contentScale = ContentScale.Crop,
                                alignment = Alignment.CenterEnd
                            )
                            // Left-to-right gradient to blend backdrop
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.horizontalGradient(
                                            colors = listOf(Color(0xFF0A0A0A), Color.Transparent),
                                            startX = 0f,
                                            endX = 300f
                                        )
                                    )
                            )
                        }
                    }
                }

                // 2. MAIN LAYOUT (Horizontal)
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 48.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically // Centralizar info com a capa
                ) {
                    // LEFT PART: POSTER ONLY
                    Column(
                        modifier = Modifier.padding(end = 24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Surface(
                            modifier = Modifier
                                .size(width = 180.dp, height = 270.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .shadow(20.dp, RoundedCornerShape(12.dp)),
                            color = Color.DarkGray
                        ) {
                            AsyncImage(
                                model = ImageRequest.Builder(LocalContext.current)
                                    .data("https://image.tmdb.org/t/p/w500${tvDetails.posterPath}")
                                    .crossfade(true).build(),
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.FillBounds
                            )
                        }
                    }

                    // RIGHT PART: INFORMATION (Compactado e centralizado)
                    Column(
                        modifier = Modifier.weight(1f)
                    ) {
                        if (!tvDetails.logoPath.isNullOrEmpty()) {
                            AsyncImage(
                                model = "https://image.tmdb.org/t/p/w500${tvDetails.logoPath}",
                                contentDescription = tvDetails.name,
                                modifier = Modifier.height(65.dp).widthIn(max = 350.dp), // Logo reduzida
                                contentScale = ContentScale.Fit,
                                alignment = Alignment.CenterStart
                            )
                        } else {
                            Text(text = tvDetails.name, color = Color.White, fontSize = 26.sp, fontWeight = FontWeight.Bold) // Título reduzido
                        }
                        
                        Spacer(modifier = Modifier.height(4.dp))
                        
                        Text(
                            text = tvDetails.originalName ?: "", 
                            color = Color(0xFFAAAAAA), 
                            fontSize = 13.sp,
                            style = TextStyle(shadow = Shadow(Color.Black, Offset(1f, 1f), 4f))
                        )
                        
                        Spacer(modifier = Modifier.height(12.dp))
                        
                        // Metadata Line
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            val seasonCount = tvDetails.seasons?.count { it.seasonNumber > 0 } ?: 0
                            val episodeCount = tvDetails.seasons?.sumOf { it.episodeCount } ?: 0
                            val textStyle = TextStyle(
                                color = Color.White,
                                fontSize = 14.sp, // Metadados reduzidos
                                shadow = Shadow(Color.Black.copy(alpha = 0.8f), Offset(1f, 1f), 4f)
                            )

                            Icon(Icons.Default.PlayArrow, null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Text(" $seasonCount Temporada(s)  ·  ", style = textStyle)
                            Icon(Icons.Default.Menu, null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Text(" $episodeCount Episódio(s)  ·  ", style = textStyle)
                            Icon(Icons.Default.DateRange, null, tint = Color.White, modifier = Modifier.size(14.dp))
                            Text(" ${(tvDetails.firstAirDate ?: "").take(4)}  ·  ", style = textStyle)
                            Icon(Icons.Default.Info, null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Text(" ${tvDetails.genres?.joinToString(", ") { it.name } ?: ""}", style = textStyle, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        val creators = tvDetails.createdBy?.joinToString { it.name } ?: ""
                        val cast = tvDetails.credits?.cast?.take(5)?.joinToString { it.name } ?: ""
                        
                        if (creators.isNotEmpty()) {
                            Text(
                                text = buildAnnotatedString { 
                                    withStyle(SpanStyle(color = Color(0xFFAAAAAA))) { append("Criado por: ") }
                                    withStyle(SpanStyle(color = Color.White)) { append(creators) }
                                },
                                fontSize = 13.sp, // Créditos reduzidos
                                style = TextStyle(shadow = Shadow(Color.Black.copy(alpha = 0.8f), Offset(1f, 1f), 4f))
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                        }
                        
                        if (cast.isNotEmpty()) {
                            Text(
                                text = buildAnnotatedString { 
                                    withStyle(SpanStyle(color = Color(0xFFAAAAAA))) { append("Elenco: ") }
                                    withStyle(SpanStyle(color = Color.White)) { append(cast) }
                                },
                                fontSize = 13.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                style = TextStyle(shadow = Shadow(Color.Black.copy(alpha = 0.8f), Offset(1f, 1f), 4f))
                            )
                        }
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        // Synopsis Box (Mais compacta)
                        Surface(
                            color = Color(0xFF1A1A1A).copy(alpha = 0.8f), 
                            shape = RoundedCornerShape(8.dp), 
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = tvDetails.overview, 
                                color = Color(0xFFEEEEEE), 
                                fontSize = 14.sp, // Sinopse reduzida
                                lineHeight = 20.sp, 
                                maxLines = 3, 
                                overflow = TextOverflow.Ellipsis, 
                                modifier = Modifier.padding(12.dp),
                                style = TextStyle(shadow = Shadow(Color.Black.copy(alpha = 0.8f), Offset(1f, 1f), 4f))
                            )
                        }
                    }
                }
                // BOTTOM GRADIENT OF BANNER
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(80.dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color(0xFF0A0A0A))
                            )
                        )
                )
            }

            // BOTTOM SECTION: SEASONS & EPISODES (Harmonizado)
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 48.dp, vertical = 8.dp)
            ) {
                // CONTAINER 1: TEMPORADAS
                Surface(
                    color = Color(0xFF1A1A1A),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    LazyRow(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                            .focusRequester(seasonsFocusRequester)
                            .focusProperties { down = episodesFocusRequester },
                        horizontalArrangement = Arrangement.Start,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val seasons = tvDetails.seasons?.filter { it.seasonNumber > 0 } ?: emptyList()
                        items(seasons) { season ->
                            val isSelected = selectedSeasonNumber == season.seasonNumber
                            val interactionSource = remember { MutableInteractionSource() }
                            val isFocused by interactionSource.collectIsFocusedAsState()
                            
                            Box(
                                modifier = Modifier
                                    .padding(end = 8.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(
                                        if (isFocused) Color(0x22FFFFFF) 
                                        else if (isSelected) Color(0xFF2A2A2A) 
                                        else Color.Transparent
                                    )
                                    .border(
                                        width = if (isFocused) 2.dp else 0.dp,
                                        color = if (isFocused) Color.White else Color.Transparent,
                                        shape = RoundedCornerShape(8.dp)
                                    )
                                    .focusable(interactionSource = interactionSource)
                                    .clickable(interactionSource = interactionSource, indication = null) { 
                                        selectedSeasonNumber = season.seasonNumber
                                        onSeasonSelect(season.seasonNumber)
                                    }
                                    .padding(horizontal = 10.dp, vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "Temporada ${season.seasonNumber}", 
                                    color = if (isSelected || isFocused) Color.White else Color(0xFF888888), 
                                    fontSize = 13.sp, 
                                    fontWeight = if (isSelected || isFocused) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // CONTAINER 2: EPISÓDIOS
                Surface(
                    color = Color(0xFF1A1A1A),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    LazyRow(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                            .focusRequester(episodesFocusRequester),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        items(episodes) { ep -> EpisodeCard(ep, onEpisodeClick) }
                    }
                }
            }
        }
    }
}

@Composable
fun EpisodeCard(episode: TmdbEpisode, onClick: (TmdbEpisode) -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    Column(modifier = Modifier
        .width(220.dp)
        .zIndex(if (isFocused) 1f else 0f)
        .focusable(interactionSource = interactionSource)
        .clickable(interactionSource = interactionSource, indication = null) { onClick(episode) }
    ) {
        Box(modifier = Modifier
            .size(width = 220.dp, height = 124.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0xFF2A2A2A))
        ) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current).data("https://image.tmdb.org/t/p/w300${episode.stillPath}").crossfade(true).build(),
                contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop
            )
            
            if (isFocused) {
                Box(modifier = Modifier.fillMaxSize().background(Color(0x22FFFFFF)).border(2.dp, Color.White, RoundedCornerShape(8.dp)))
            }

            Surface(
                color = Color.Black.copy(alpha = 0.6f), 
                shape = RoundedCornerShape(4.dp), 
                modifier = Modifier.padding(4.dp).align(Alignment.TopStart)
            ) {
                Text(
                    text = "E${String.format("%02d", episode.episodeNumber)}", 
                    color = Color.White, 
                    fontSize = 11.sp, 
                    fontWeight = FontWeight.Bold, 
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                )
            }
            Surface(
                color = Color.Black.copy(alpha = 0.6f), 
                shape = RoundedCornerShape(4.dp), 
                modifier = Modifier.padding(4.dp).align(Alignment.BottomEnd)
            ) {
                Text(
                    text = "${episode.runtime ?: 0} min", 
                    color = Color.White, 
                    fontSize = 11.sp, 
                    fontWeight = FontWeight.Bold, 
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = episode.name, 
            color = Color.White, 
            fontSize = 12.sp,
            maxLines = 1, 
            overflow = TextOverflow.Ellipsis, 
            modifier = Modifier.padding(horizontal = 4.dp).fillMaxWidth()
        )
    }
}

@Composable
private fun RelatedCard(name: String, imageUrl: String?) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    val scale by animateFloatAsState(if (isFocused) 1.05f else 1.0f, label = "scale")

    Surface(
        onClick = { },
        interactionSource = interactionSource,
        modifier = Modifier
            .width(135.dp) // Proporção esguia
            .height(200.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .zIndex(if (isFocused) 1f else 0f),
        shape = RoundedCornerShape(6.dp),
        border = if (isFocused) BorderStroke(2.dp, Color.White) else null,
        color = Color.DarkGray
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            AsyncImage(
                model = imageUrl, 
                contentDescription = name, 
                contentScale = ContentScale.Crop, 
                modifier = Modifier.fillMaxSize()
            )

            // Faixa preta na base
            Surface(
                color = Color.Black.copy(alpha = 0.7f),
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .height(35.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = name, 
                        color = Color.White, 
                        fontSize = 9.sp, 
                        maxLines = 2, 
                        overflow = TextOverflow.Ellipsis, 
                        modifier = Modifier.padding(horizontal = 4.dp),
                        textAlign = TextAlign.Center,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
