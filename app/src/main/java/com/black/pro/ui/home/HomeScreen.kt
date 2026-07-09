package com.black.pro.ui.home

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.key.*
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.navigation.NavController
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.black.pro.R
import com.black.pro.data.model.Movie
import com.black.pro.data.model.Series
import com.black.pro.data.model.TmdbBannerItem
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun HomeScreen(
    navController: NavController,
    bannerItems: List<TmdbBannerItem>,
    recentMovies: List<Movie>,
    recentSeries: List<Series>,
    isSyncing: Boolean,
    onMovieClick: (Movie) -> Unit,
    onSeriesClick: (Series) -> Unit,
    onSync: () -> Unit,
    onLogout: () -> Unit
) {
    val listState = rememberLazyListState()
    val toolbarHeight = 110.dp
    val density = LocalDensity.current
    val configuration = LocalConfiguration.current
    val screenHeight = configuration.screenHeightDp.dp
    val bannerHeight = 550.dp // Altura fixa segura para evitar SIGABRT
    val toolbarHeightPx = with(density) { toolbarHeight.toPx() }
    val scope = rememberCoroutineScope()
    
    var isSectionsVisible by remember { mutableStateOf(false) }
    val toolbarOffsetHeightPx = remember { mutableStateOf(0f) }

    val menuFocusRequester = remember { FocusRequester() }
    val bannerFocusRequester = remember { FocusRequester() }
    val exploreFocusRequester = remember { FocusRequester() }

    val pagerState = rememberPagerState(pageCount = { bannerItems.size })

    // Logica do botão voltar
    BackHandler(enabled = isSectionsVisible) {
        scope.launch {
            isSectionsVisible = false
            listState.animateScrollToItem(0)
            toolbarOffsetHeightPx.value = 0f
            delay(400)
            try { exploreFocusRequester.requestFocus() } catch (_: Exception) {}
        }
    }

    LaunchedEffect(bannerItems.size) {
        if (bannerItems.size > 1) {
            while (true) {
                delay(9000L)
                pagerState.animateScrollToPage((pagerState.currentPage + 1) % bannerItems.size)
            }
        }
    }

    LaunchedEffect(Unit) {
        delay(600)
        try { menuFocusRequester.requestFocus() } catch (_: Exception) {}
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black) // Garante fundo preto puro no container principal
            .nestedScroll(remember {
                object : androidx.compose.ui.input.nestedscroll.NestedScrollConnection {
                    override fun onPreScroll(available: androidx.compose.ui.geometry.Offset, source: NestedScrollSource): androidx.compose.ui.geometry.Offset {
                        if (!isSectionsVisible) return androidx.compose.ui.geometry.Offset.Zero
                        val delta = available.y
                        val newOffset = toolbarOffsetHeightPx.value + delta
                        toolbarOffsetHeightPx.value = newOffset.coerceIn(-toolbarHeightPx, 0f)
                        return androidx.compose.ui.geometry.Offset.Zero
                    }
                }
            })
            .onPreviewKeyEvent { keyEvent ->
                // Bloqueia DPAD_DOWN se não estiver explorando, a menos que venha do menu para o banner
                if (keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.DirectionDown && !isSectionsVisible) {
                    // Permitimos a descida se o foco estiver no menu superior
                    false 
                } else false
            }
    ) {
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize().background(Color.Black), // Fundo preto puro na lista
            userScrollEnabled = isSectionsVisible // Trava scroll manual
        ) {
            item { Spacer(modifier = Modifier.height(toolbarHeight)) }

            item {
                Box(modifier = Modifier
                    .fillMaxWidth()
                    .height(bannerHeight)
                    .offset(y = (-toolbarHeight))
                    .background(Color.Black) // Garante fundo preto no container do banner
                ) {
                    HorizontalPager(
                        state = pagerState,
                        modifier = Modifier.fillMaxSize(),
                        userScrollEnabled = false
                    ) { page ->
                        val item = bannerItems[page]
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current)
                                .data("https://image.tmdb.org/t/p/w1280${item.backdropPath}")
                                .crossfade(800)
                                .build(),
                            contentDescription = null,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    }

                    // 1. GRADIENTE DE IMERSÃO ORIGINAL
                    Box(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.5f), Color.Black), startY = 800f)))
                    Box(modifier = Modifier.fillMaxSize().background(Brush.horizontalGradient(listOf(Color.Black.copy(alpha = 0.8f), Color.Transparent), endX = 1200f)))

                    // 2. DEGRADÊ DE TRANSIÇÃO DEFINITIVO (Equilibrado)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp) // Aumentado para cobrir a área de streaming e botões
                            .align(Alignment.BottomCenter)
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f), Color.Black)
                                )
                            )
                            .zIndex(5f)
                    )

                    val currentItem = bannerItems.getOrNull(pagerState.currentPage)
                    if (currentItem != null) {
                        Column(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(start = 64.dp, bottom = 40.dp)
                                .zIndex(20f)
                        ) {
                            Crossfade(targetState = currentItem, animationSpec = tween(600)) { item ->
                                Column {
                                    Column(modifier = Modifier.widthIn(max = 550.dp)) {
                                        if (!item.logoPath.isNullOrEmpty()) {
                                            AsyncImage(
                                                model = "https://image.tmdb.org/t/p/w500${item.logoPath}", 
                                                contentDescription = null, 
                                                modifier = Modifier.height(70.dp).padding(bottom = 6.dp), 
                                                contentScale = ContentScale.Fit, 
                                                alignment = Alignment.CenterStart
                                            )
                                        } else {
                                            Text(
                                                text = item.title, 
                                                color = Color.White, 
                                                fontSize = 24.sp, 
                                                fontWeight = FontWeight.Bold, 
                                                modifier = Modifier.padding(bottom = 4.dp),
                                                style = TextStyle(shadow = Shadow(Color.Black, Offset(2f, 2f), 6f))
                                            )
                                        }
                                        
                                        // Linha 1 — Badges e avaliação
                                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 6.dp)) {
                                            // Logo IMDb + Nota
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Box(
                                                    modifier = Modifier
                                                        .height(24.dp)
                                                        .background(Color(0xFFF5C518), RoundedCornerShape(4.dp))
                                                        .padding(horizontal = 6.dp),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Text(
                                                        "IMDb", 
                                                        color = Color.Black, 
                                                        fontSize = 12.sp, 
                                                        fontWeight = FontWeight.Bold
                                                    )
                                                }
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text(
                                                    text = String.format("%.1f", item.voteAverage),
                                                    color = Color(0xFFF5C518),
                                                    fontSize = 15.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    style = TextStyle(shadow = Shadow(Color.Black, Offset(1f, 1f), 2f))
                                                )
                                            }

                                            Spacer(modifier = Modifier.width(10.dp))
                                            Text("·", color = Color(0xFF666666), fontSize = 14.sp)
                                            Spacer(modifier = Modifier.width(10.dp))

                                            // Ano
                                            Text(
                                                text = item.releaseYear, 
                                                color = Color(0xFFCCCCCC), 
                                                fontSize = 14.sp,
                                                style = TextStyle(shadow = Shadow(Color.Black, Offset(1f, 1f), 2f))
                                            )

                                            Spacer(modifier = Modifier.width(10.dp))
                                            Text("·", color = Color(0xFF666666), fontSize = 14.sp)
                                            Spacer(modifier = Modifier.width(10.dp))

                                            // Badge UHD
                                            Surface(
                                                color = Color.Transparent,
                                                border = BorderStroke(1.dp, Color(0xFF666666)),
                                                shape = RoundedCornerShape(4.dp)
                                            ) {
                                                Text(
                                                    "UHD", 
                                                    color = Color.White, 
                                                    fontSize = 11.sp,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                )
                                            }

                                            // Badge Classificação
                                            if (!item.ageRating.isNullOrEmpty()) {
                                                Spacer(modifier = Modifier.width(10.dp))
                                                Text("·", color = Color(0xFF666666), fontSize = 14.sp)
                                                Spacer(modifier = Modifier.width(10.dp))
                                                Surface(
                                                    color = Color.DarkGray,
                                                    shape = RoundedCornerShape(4.dp)
                                                ) {
                                                    Text(
                                                        text = item.ageRating, 
                                                        color = Color.White, 
                                                        fontSize = 11.sp,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                    )
                                                }
                                            }
                                        }

                                        // Linha 2 — Sinopse
                                        Text(
                                            text = item.overview, 
                                            color = Color(0xFFDDDDDD),
                                            fontSize = 14.sp,
                                            maxLines = 2, // Reduzido para caber melhor
                                            overflow = TextOverflow.Ellipsis, 
                                            lineHeight = 18.sp,
                                            modifier = Modifier.padding(bottom = 12.dp),
                                            style = TextStyle(shadow = Shadow(Color.Black, Offset(1f, 1f), 2f))
                                        )
                                    }

                                    Row(modifier = Modifier.padding(bottom = 16.dp)) {
                                        var isBtnFocused by remember { mutableStateOf(false) }
                                        Surface(
                                            onClick = { },
                                            modifier = Modifier
                                                .focusRequester(bannerFocusRequester)
                                                .onFocusChanged { isBtnFocused = it.isFocused }
                                                .focusProperties { 
                                                    up = menuFocusRequester 
                                                    // down será o streaming fora do banner
                                                }
                                                .focusable(),
                                            color = if (isBtnFocused) Color.White else Color.White.copy(alpha = 0.2f),
                                            shape = RoundedCornerShape(8.dp),
                                            border = if (isBtnFocused) BorderStroke(3.dp, Color.White) else null
                                        ) {
                                            Row(modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Default.PlayArrow, null, tint = if (isBtnFocused) Color.Black else Color.White, modifier = Modifier.size(18.dp))
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text("Assista agora", color = if (isBtnFocused) Color.Black else Color.White, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Seção "Escolha seu Streaming" - FORA DO BANNER
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 64.dp, vertical = 16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Escolha seu Streaming",
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    val context = LocalContext.current
                    val platforms = remember {
                        listOf(
                            Triple("Apple TV+", R.drawable.appletv, "https://tv.apple.com"),
                            Triple("Crunchyroll", R.drawable.crunchyroll, "https://crunchyroll.com"),
                            Triple("Disney+", R.drawable.disneyplus, "https://disneyplus.com"),
                            Triple("Globoplay", R.drawable.globoplay, "https://globoplay.globo.com"),
                            Triple("HBO Max", R.drawable.hbomax, "https://hbomax.com"),
                            Triple("Max", R.drawable.max, "https://max.com"),
                            Triple("Netflix", R.drawable.netflix, "https://netflix.com"),
                            Triple("Paramount+", R.drawable.paramount, "https://paramountplus.com"),
                            Triple("Prime Video", R.drawable.primevideo, "https://primevideo.com")
                        )
                    }

                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        contentPadding = PaddingValues(end = 16.dp)
                    ) {
                        items(platforms.size) { index ->
                            val platform = platforms[index]
                            val interactionSource = remember { MutableInteractionSource() }
                            val isFocused by interactionSource.collectIsFocusedAsState()
                            
                            val scale by animateFloatAsState(
                                targetValue = if (isFocused) 1.08f else 1.0f,
                                animationSpec = tween(150),
                                label = "scale"
                            )

                            Surface(
                                onClick = {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(platform.third))
                                    context.startActivity(intent)
                                },
                                interactionSource = interactionSource,
                                modifier = Modifier
                                    .size(width = 100.dp, height = 58.dp)
                                    .graphicsLayer {
                                        scaleX = scale
                                        scaleY = scale
                                    },
                                shape = RoundedCornerShape(10.dp),
                                border = if (isFocused) BorderStroke(2.dp, Color.White) else null,
                                color = Color.Transparent
                            ) {
                                Image(
                                    painter = painterResource(id = platform.second),
                                    contentDescription = platform.first,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.FillBounds
                                )
                            }
                        }
                    }
                }
            }

            // BOTÃO EXPLORAR - FORA DO BANNER
            item {
                var isExploreFocused by remember { mutableStateOf(false) }
                val infiniteTransition = rememberInfiniteTransition(label = "pulse")
                val translationY by infiniteTransition.animateFloat(
                    initialValue = 0f,
                    targetValue = 6f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(1000, easing = LinearEasing),
                        repeatMode = RepeatMode.Reverse
                    ),
                    label = "yAnimation"
                )

                val exploreScale by animateFloatAsState(
                    targetValue = if (isExploreFocused) 1.05f else 1.0f,
                    animationSpec = tween(durationMillis = 150),
                    label = "exploreScale"
                )

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp)
                        .graphicsLayer {
                            scaleX = exploreScale
                            scaleY = exploreScale
                        }
                        .focusRequester(exploreFocusRequester)
                        .onFocusChanged { isExploreFocused = it.isFocused }
                        .clickable(
                            indication = null,
                            interactionSource = remember { MutableInteractionSource() }
                        ) {
                            toolbarOffsetHeightPx.value = -toolbarHeightPx
                            isSectionsVisible = true
                            scope.launch {
                                delay(100)
                                listState.animateScrollToItem(3, scrollOffset = 0)
                            }
                        }
                        .focusable()
                ) {
                    Text(
                        "EXPLORAR", 
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 2.sp,
                        modifier = Modifier.alpha(if (isExploreFocused) 1f else 0.6f)
                    )
                    Icon(
                        imageVector = Icons.Default.KeyboardArrowDown,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier
                            .size(14.dp)
                            .alpha(if (isExploreFocused) 1f else 0.6f)
                            .graphicsLayer { 
                                this.translationY = if (isExploreFocused) translationY else 0f
                            }
                    )
                }
            }

            item {
                AnimatedVisibility(
                    visible = isSectionsVisible,
                    enter = fadeIn(animationSpec = tween(600)) + expandVertically(animationSpec = tween(600)),
                    exit = fadeOut(animationSpec = tween(400)) + shrinkVertically(animationSpec = tween(400))
                ) {
                    Column(modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp, bottom = 64.dp)
                        .background(Color.Black) // Preto total aqui também
                    ) {
                        if (recentMovies.isNotEmpty()) {
                            HomeRow(
                                title = "Filmes Recém Adicionados",
                                subtitle = "Para maratonar",
                                items = recentMovies, 
                                onItemClick = { onMovieClick(it as Movie) },
                                modifier = Modifier.onPreviewKeyEvent { 
                                    if (it.type == KeyEventType.KeyDown && it.key == Key.DirectionUp) {
                                        // Bloqueia a subida para o banner TMDB via seta
                                        true 
                                    } else false
                                }
                            )
                        }
                        Spacer(modifier = Modifier.height(32.dp))
                        if (recentSeries.isNotEmpty()) {
                            HomeRow(
                                title = "Séries Recém Adicionadas", 
                                subtitle = "Para se atualizar",
                                items = recentSeries, 
                                onItemClick = { onSeriesClick(it as Series) }
                            )
                        }
                    }
                }
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(250.dp)
                .offset { IntOffset(x = 0, y = toolbarOffsetHeightPx.value.roundToInt()) }
                .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.9f), Color.Transparent)))
                .zIndex(40f)
        )

        TopNavigationBar(
            navController = navController,
            onSync = onSync,
            onLogout = onLogout,
            isSyncing = isSyncing,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .height(toolbarHeight)
                .offset { IntOffset(x = 0, y = toolbarOffsetHeightPx.value.roundToInt()) }
                .zIndex(100f)
                .focusRequester(menuFocusRequester)
                .focusProperties { 
                    down = bannerFocusRequester 
                }
                .background(Color.Transparent)
        )
    }
}

@Composable
fun TopNavigationBar(
    navController: NavController,
    onSync: () -> Unit,
    onLogout: () -> Unit,
    isSyncing: Boolean = false,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(110.dp)
            .padding(horizontal = 64.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Image(painter = painterResource(id = R.drawable.logo_black), contentDescription = "BLACK", modifier = Modifier.height(30.dp).padding(end = 20.dp), contentScale = ContentScale.Fit)
            Row {
                TopNavItem("Início") { }
                TopNavItem("TV ao vivo") { navController.navigate("categories/live") }
                TopNavItem("Filmes") { navController.navigate("categories/movie") }
                TopNavItem("Séries") { navController.navigate("categories/series") }
            }
            Spacer(modifier = Modifier.weight(1f))
            Row {
                TopNavAction(Icons.Default.Search, "Buscar") { }
                TopNavAction(Icons.Default.Refresh, "Recarregar", isAnimating = isSyncing) { onSync() }
                TopNavAction(Icons.AutoMirrored.Filled.ExitToApp, "Sair") { onLogout() }
            }
        }
    }
}

@Composable
fun TopNavItem(label: String, onClick: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        modifier = Modifier.padding(horizontal = 3.dp),
        color = if (isFocused) Color.White else Color.Transparent,
        shape = RoundedCornerShape(8.dp),
        border = if (isFocused) BorderStroke(2.dp, Color.White) else null
    ) {
        Text(text = label, color = if (isFocused) Color.Black else Color.White.copy(alpha = 0.7f), modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp), fontSize = 13.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun TopNavAction(icon: ImageVector, label: String, isAnimating: Boolean = false, onClick: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val rotation by animateFloatAsState(
        targetValue = if (isAnimating) 360f else 0f,
        animationSpec = if (isAnimating) {
            infiniteRepeatable(
                animation = tween(1000, easing = LinearEasing),
                repeatMode = RepeatMode.Restart
            )
        } else {
            tween(0)
        },
        label = "rotation"
    )

    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        modifier = Modifier.padding(horizontal = 3.dp),
        color = if (isFocused) Color.White else Color.Transparent,
        shape = RoundedCornerShape(8.dp),
        border = if (isFocused) BorderStroke(2.dp, Color.White) else null
    ) {
        Row(modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = icon, 
                contentDescription = label, 
                tint = if (isFocused) Color.Black else Color.White.copy(alpha = 0.7f), 
                modifier = Modifier
                    .size(16.dp)
                    .graphicsLayer { rotationZ = rotation }
            )
            if (isFocused) {
                Spacer(modifier = Modifier.width(6.dp))
                Text(text = label, color = Color.Black, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun HomeRow(
    title: String, 
    subtitle: String? = null, 
    items: List<Any>, 
    onItemClick: (Any) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        Column(modifier = Modifier.padding(start = 16.dp, bottom = 12.dp)) { // Padding 16dp conforme solicitado
            Text(
                text = title, 
                color = Color.White, 
                fontSize = 16.sp, // Fonte 16sp
                fontWeight = FontWeight.Bold
            )
            if (subtitle != null) {
                Text(
                    text = subtitle, 
                    color = Color(0xFF888888), // Cor #888888
                    fontSize = 12.sp, // Fonte 12sp
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp), // Padding horizontal 16dp
            horizontalArrangement = Arrangement.spacedBy(8.dp) // Margin 8dp entre os cards
        ) {
            items(items) { item ->
                ContentCard(
                    name = if (item is Movie) item.name else (item as Series).name,
                    imageUrl = if (item is Movie) item.streamIcon else (item as Series).cover,
                    onClick = { onItemClick(item) }
                )
            }
        }
    }
}

@Composable
fun ContentCard(name: String, imageUrl: String?, onClick: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    
    val scale by animateFloatAsState(
        targetValue = if (isFocused) 1.05f else 1.0f,
        animationSpec = tween(durationMillis = 150),
        label = "scale"
    )

    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        modifier = Modifier
            .padding(vertical = 8.dp)
            .width(135.dp) // Proporção esguia
            .height(200.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .zIndex(if (isFocused) 1f else 0f),
        color = Color(0xFF1E1E21),
        shape = RoundedCornerShape(6.dp),
        border = if (isFocused) BorderStroke(2.dp, Color.White) else BorderStroke(0.5.dp, Color.White.copy(alpha = 0.1f)),
        tonalElevation = if (isFocused) 12.dp else 0.dp
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            AsyncImage(
                model = imageUrl, 
                contentDescription = name, 
                modifier = Modifier.fillMaxSize(), 
                contentScale = ContentScale.Crop
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
                        fontWeight = FontWeight.Bold, 
                        textAlign = TextAlign.Center,
                        maxLines = 2, 
                        overflow = TextOverflow.Ellipsis, 
                        modifier = Modifier.padding(horizontal = 4.dp)
                    )
                }
            }
        }
    }
}

