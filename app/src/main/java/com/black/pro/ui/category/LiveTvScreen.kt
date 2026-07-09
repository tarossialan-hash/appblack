package com.black.pro.ui.category

import android.util.Base64
import android.util.Log
import androidx.media3.exoplayer.DefaultLoadControl

import java.text.SimpleDateFormat
import java.util.*
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.zIndex
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import android.app.Activity
import android.view.WindowManager
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.black.pro.R
import com.black.pro.data.model.Category
import com.black.pro.data.model.EpgListing
import com.black.pro.data.model.LiveStream
import kotlinx.coroutines.delay

fun decodificarTitulo(titulo: String): String {
    return try {
        val decodedBytes = Base64.decode(titulo, Base64.DEFAULT)
        String(decodedBytes, Charsets.UTF_8)
    } catch (e: Exception) {
        titulo
    }
}

fun formatarHorario(timestamp: String?): String {
    if (timestamp == null) return ""
    return try {
        val ts = timestamp.toLong()
        val date = Date(ts * 1000)
        val sdf = SimpleDateFormat("HH:mm", Locale.getDefault())
        sdf.format(date)
    } catch (e: Exception) {
        try {
            if (timestamp.contains(" ")) {
                timestamp.substringAfter(" ").take(5)
            } else {
                timestamp
            }
        } catch (e2: Exception) {
            timestamp
        }
    }
}

@Composable
fun LiveTvScreen(
    categories: List<Category>,
    channels: List<LiveStream>,
    epgList: List<EpgListing>,
    username: String,
    password: String,
    playingChannel: LiveStream?,
    focusedChannel: LiveStream?,
    selectedCategory: Category?,
    onCategorySelect: (Category) -> Unit,
    onPlayingChannelChange: (LiveStream?) -> Unit,
    onChannelFocus: (LiveStream?) -> Unit,
    onFetchEpg: (Int) -> Unit
) {
    val firstCategoryFocusRequester = remember { FocusRequester() }
    val channelFocusRequesters = remember { mutableStateMapOf<Int, FocusRequester>() }
    val channelListState = rememberLazyListState()
    val context = LocalContext.current
    
    var isFullScreen by remember { mutableStateOf(false) }
    var showOverlay by remember { mutableStateOf(false) }

    // Restaura o foco ao sair da tela cheia
    LaunchedEffect(isFullScreen) {
        if (!isFullScreen && playingChannel != null) {
            val index = channels.indexOfFirst { it.streamId == playingChannel.streamId }
            if (index >= 0) {
                delay(150)
                try {
                    channelListState.scrollToItem(index)
                    channelFocusRequesters[playingChannel.streamId]?.requestFocus()
                } catch (_: Exception) {}
            }
        }
    }

    // Botão voltar sai da tela cheia
    BackHandler(enabled = isFullScreen) {
        if (showOverlay) {
            showOverlay = false
        } else {
            isFullScreen = false
        }
    }

    // Ajuste Cirúrgico: Foco inicial sem pré-seleção e sem carregar canais automaticamente
    LaunchedEffect(categories) {
        if (selectedCategory == null && categories.isNotEmpty()) {
            delay(300)
            try {
                firstCategoryFocusRequester.requestFocus()
            } catch (_: Exception) {}
        }
    }

    // Ajuste 2: Lista de canais sempre começa do topo ao trocar de categoria
    LaunchedEffect(channels) {
        if (channels.isNotEmpty()) {
            try {
                channelListState.scrollToItem(0)
            } catch (_: Exception) {}
        }
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF121212))
    ) {
        // COLUNA 1: CATEGORIAS (25%)
        if (!isFullScreen) {
            Surface(
                modifier = Modifier
                    .fillMaxHeight()
                    .weight(0.25f),
                color = Color(0xFF1A1A1A)
            ) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(vertical = 8.dp)
                ) {
                    itemsIndexed(categories) { index, category ->
                        val isSelected = selectedCategory?.categoryId == category.categoryId
                        CategoryListItem(
                            category = category,
                            isSelected = isSelected,
                            modifier = if (index == 0) Modifier.focusRequester(firstCategoryFocusRequester) else Modifier,
                            onClick = { 
                                onCategorySelect(category)
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(4.dp))

            // COLUNA 2: LISTA DE CANAIS (30%)
            Surface(
                modifier = Modifier
                    .fillMaxHeight()
                    .weight(0.30f),
                color = Color(0xFF141414)
            ) {
                if (channels.isNotEmpty()) {
                    LazyColumn(
                        state = channelListState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(vertical = 8.dp)
                    ) {
                        itemsIndexed(channels) { index, channel ->
                            val isCurrentPlaying = playingChannel?.streamId == channel.streamId
                            val focusRequester = channelFocusRequesters.getOrPut(channel.streamId) { FocusRequester() }
                            
                            ChannelListItem(
                                channel = channel,
                                isSelected = isCurrentPlaying,
                                modifier = Modifier.focusRequester(focusRequester),
                                onFocused = { 
                                    onChannelFocus(channel) 
                                },
                                onClick = { 
                                    if (channel.streamId != 0) {
                                        if (isCurrentPlaying) {
                                            isFullScreen = true
                                        } else {
                                            onPlayingChannelChange(channel)
                                        }
                                    } else {
                                        Toast.makeText(context, "URL do canal não disponível", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            )
                        }
                    }
                } else if (selectedCategory != null) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(32.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.width(4.dp))
        }

        // COLUNA 3: PREVIEW E PROGRAMAÇÃO (45%) ou TELA CHEIA (100%)
        Column(
            modifier = Modifier
                .fillMaxHeight()
                .weight(if (isFullScreen) 1f else 0.45f)
                .background(Color(0xFF121212))
        ) {
            // Parte Superior: Player (Proporção 16:9 para mini player)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .then(if (isFullScreen) Modifier.weight(1f) else Modifier.aspectRatio(16f / 9f))
                    .background(Color.Transparent)
            ) {
                if (playingChannel != null) {
                    val streamUrl = "http://bkpac.cc/live/$username/$password/${playingChannel.streamId}.ts"
                    
                    ChannelPreviewPlayer(
                        streamUrl = streamUrl,
                        isFullScreen = isFullScreen,
                        channel = playingChannel,
                        epgList = epgList,
                        showOverlay = showOverlay,
                        onShowOverlayChange = { showOverlay = it },
                        onClick = { 
                            if (isFullScreen) showOverlay = !showOverlay else isFullScreen = true 
                        }
                    )
                } else {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = "Selecione um canal para assistir",
                            color = Color(0xFF888888),
                            fontSize = 14.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            // Parte Inferior: Programação (EPG) dentro de um container/card
            if (!isFullScreen) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(top = 8.dp),
                    color = Color(0xFF1A1A1A),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "PROGRAMAÇÃO",
                            color = Color(0xFF666666),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(bottom = 12.dp)
                        )

                        if (focusedChannel != null || playingChannel != null) {
                            if (epgList.isNotEmpty()) {
                                LazyColumn {
                                    itemsIndexed(epgList) { index, epg ->
                                        val startTime = formatarHorario(epg.start)
                                        val endTime = formatarHorario(epg.end)
                                        
                                        EpgListItem(
                                            time = "$startTime - $endTime",
                                            title = decodificarTitulo(epg.title),
                                            isCurrent = index == 0,
                                            startTime = epg.start,
                                            endTime = epg.end
                                        )
                                    }
                                }
                            } else {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Text(
                                        "Programação não disponível",
                                        color = Color.Gray,
                                        fontSize = 14.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CategoryListItem(
    category: Category,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp)
            .padding(bottom = 2.dp),
        color = if (isFocused) Color(0xFF2A2A2A) else Color.Transparent,
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (isFocused || isSelected) {
                Box(modifier = Modifier.width(3.dp).height(24.dp).background(Color.White))
            } else {
                Spacer(modifier = Modifier.width(3.dp))
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Text(
                text = category.categoryName,
                color = if (isFocused || isSelected) Color.White else Color.Gray,
                fontSize = 15.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
                fontWeight = if (isSelected || isFocused) FontWeight.Bold else FontWeight.Normal
            )
            
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = if (isFocused) Color.White else Color.Gray,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

@Composable
fun ChannelListItem(
    channel: LiveStream,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onFocused: () -> Unit,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    LaunchedEffect(isFocused) {
        if (isFocused) onFocused()
    }

    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        modifier = modifier
            .fillMaxWidth()
            .height(64.dp)
            .padding(horizontal = 8.dp, vertical = 2.dp),
        color = if (isFocused || isSelected) Color(0xFF2A2A2A) else Color.Transparent,
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier.padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (isFocused || isSelected) {
                Box(modifier = Modifier.width(3.dp).height(30.dp).background(Color.White))
            } else {
                Spacer(modifier = Modifier.width(3.dp))
            }
            Spacer(modifier = Modifier.width(12.dp))
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(6.dp)),
                contentAlignment = Alignment.Center
            ) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(channel.streamIcon)
                        .crossfade(200)
                        .build(),
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    contentScale = ContentScale.Fit
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = channel.name,
                color = Color.White,
                fontSize = 14.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            Spacer(modifier = Modifier.width(12.dp))
        }
    }
}

@Composable
fun EpgListItem(
    time: String,
    title: String,
    isCurrent: Boolean,
    startTime: String? = null,
    endTime: String? = null
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Surface(
            color = if (isCurrent) Color(0xFF2A2A2A) else Color.Transparent,
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .padding(horizontal = 10.dp, vertical = 10.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = time.substringBefore(" - "),
                        color = Color(0xFF666666),
                        fontSize = 12.sp,
                        modifier = Modifier.width(45.dp)
                    )
                    
                    Spacer(modifier = Modifier.width(8.dp))

                    Text(
                        text = title,
                        color = if (isCurrent) Color.White else Color(0xFF888888),
                        fontSize = 13.sp,
                        fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    if (isCurrent) {
                        Surface(
                            color = Color(0xFFE53935),
                            shape = RoundedCornerShape(4.dp),
                            modifier = Modifier.padding(start = 8.dp)
                        ) {
                            Text(
                                "AO VIVO",
                                color = Color.White,
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                if (isCurrent && startTime != null && endTime != null) {
                    var progress by remember { mutableFloatStateOf(0f) }
                    
                    LaunchedEffect(startTime, endTime) {
                        while (true) {
                            try {
                                val start = startTime.toLong()
                                val end = endTime.toLong()
                                val now = System.currentTimeMillis() / 1000
                                if (end > start) {
                                    progress = ((now - start).toFloat() / (end - start).toFloat()).coerceIn(0f, 1f)
                                }
                            } catch (_: Exception) {}
                            delay(60000)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(3.dp)
                            .background(Color(0xFF333333), RoundedCornerShape(2.dp))
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(progress)
                                .fillMaxHeight()
                                .background(Color(0xFFE53935), RoundedCornerShape(2.dp))
                        )
                    }
                }
            }
        }
        
        if (!isCurrent) {
            HorizontalDivider(
                thickness = 1.dp,
                color = Color(0xFF222222),
                modifier = Modifier.padding(horizontal = 4.dp)
            )
        }
    }
}

@androidx.annotation.OptIn(UnstableApi::class)
@Composable
private fun ChannelPreviewPlayer(
    streamUrl: String,
    isFullScreen: Boolean,
    channel: LiveStream,
    epgList: List<EpgListing>,
    showOverlay: Boolean,
    onShowOverlayChange: (Boolean) -> Unit,
    onClick: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val activity = context as? Activity
    
    var isPlayerVisible by remember { mutableStateOf(true) }
    var currentTime by remember { mutableStateOf("") }

    // Relógio em tempo real
    LaunchedEffect(isFullScreen) {
        while (isFullScreen) {
            val sdf = SimpleDateFormat("dd-MM-yyyy HH:mm:ss", Locale.getDefault())
            currentTime = sdf.format(Date())
            delay(1000)
        }
    }

    // Timer para ocultar overlay
    LaunchedEffect(showOverlay, isFullScreen) {
        if (showOverlay && isFullScreen) {
            delay(5000)
            onShowOverlayChange(false)
        }
    }

    // Mostra overlay ao entrar em tela cheia
    LaunchedEffect(isFullScreen) {
        if (isFullScreen) {
            onShowOverlayChange(true)
        }
    }

    val exoPlayer = remember {
        val dataSourceFactory = DefaultHttpDataSource.Factory()
            .setConnectTimeoutMs(30000)
            .setReadTimeoutMs(30000)
            .setAllowCrossProtocolRedirects(true)

        val mediaSourceFactory = DefaultMediaSourceFactory(dataSourceFactory)
        
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(15_000, 50_000, 1_000, 2_000)
            .build()

        ExoPlayer.Builder(context)
            .setMediaSourceFactory(mediaSourceFactory)
            .setLoadControl(loadControl)
            .build().apply {
                playWhenReady = true
                addListener(object : Player.Listener {
                    override fun onPlayerError(error: PlaybackException) {
                        Log.e("LiveTvPlayer", "Error: ${error.message}", error)
                    }
                })
            }
    }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_PAUSE -> {
                    isPlayerVisible = false
                    exoPlayer.pause()
                    activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
                Lifecycle.Event.ON_STOP -> {
                    isPlayerVisible = false
                    exoPlayer.stop()
                    activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
                Lifecycle.Event.ON_RESUME -> {
                    isPlayerVisible = true
                    if (exoPlayer.playbackState == Player.STATE_READY) {
                        activity?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    }
                    exoPlayer.play()
                }
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            exoPlayer.stop()
            exoPlayer.release()
        }
    }

    LaunchedEffect(streamUrl) {
        if (streamUrl.isNotEmpty()) {
            val listener = object : Player.Listener {
                override fun onPlayerError(error: PlaybackException) {
                    activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    Toast.makeText(context, "Erro ao reproduzir canal. Verifique sua conexão.", Toast.LENGTH_SHORT).show()
                }

                override fun onPlaybackStateChanged(state: Int) {
                    when (state) {
                        Player.STATE_READY -> {
                            activity?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        }
                        Player.STATE_BUFFERING, Player.STATE_IDLE, Player.STATE_ENDED -> {
                            activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        }
                    }
                }
            }
            exoPlayer.addListener(listener)
            
            try {
                val mediaSource = if (streamUrl.contains(".ts")) {
                    val dataSourceFactory = DefaultHttpDataSource.Factory()
                        .setConnectTimeoutMs(30000)
                        .setReadTimeoutMs(30000)
                        .setAllowCrossProtocolRedirects(true)
                    
                    ProgressiveMediaSource.Factory(dataSourceFactory)
                        .createMediaSource(MediaItem.fromUri(streamUrl))
                } else {
                    null
                }

                if (mediaSource != null) {
                    exoPlayer.setMediaSource(mediaSource)
                } else {
                    val mediaItem = when {
                        streamUrl.contains(".m3u8") -> {
                            MediaItem.Builder()
                                .setUri(streamUrl)
                                .setMimeType(MimeTypes.APPLICATION_M3U8)
                                .build()
                        }
                        else -> {
                            MediaItem.Builder()
                                .setUri(streamUrl)
                                .setMimeType(MimeTypes.VIDEO_MP2T)
                                .build()
                        }
                    }
                    exoPlayer.setMediaItem(mediaItem)
                }
                exoPlayer.prepare()
                exoPlayer.play()
            } catch (_: Exception) {
                Toast.makeText(context, "Erro ao carregar canal", Toast.LENGTH_SHORT).show()
            }
        }
    }

    if (isPlayerVisible) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .then(if (isFullScreen) Modifier else Modifier.padding(8.dp))
                .clip(RoundedCornerShape(if (isFullScreen) 0.dp else 12.dp))
                .background(Color(0xFF121212))
                .onKeyEvent {
                    val isBackKey = it.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_BACK
                    
                    if (isFullScreen && it.type == KeyEventType.KeyUp && !isBackKey) {
                        onShowOverlayChange(true)
                    }
                    if ((it.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_DPAD_CENTER || 
                         it.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_ENTER) && 
                        it.type == KeyEventType.KeyUp) {
                        if (isFullScreen) onShowOverlayChange(true) else onClick()
                        true
                    } else false
                }
                .focusRequester(remember { FocusRequester() })
                .focusable()
        ) {
            AndroidView(
                factory = {
                    PlayerView(context).apply {
                        player = exoPlayer
                        useController = false
                        resizeMode = androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                    }
                },
                update = { playerView ->
                    playerView.resizeMode = androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                },
                modifier = Modifier.fillMaxSize()
            )

            // Camada de clique invisível sobre o player em tela cheia
            if (isFullScreen) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .clickable(
                            indication = null,
                            interactionSource = remember { MutableInteractionSource() }
                        ) {
                            onShowOverlayChange(true)
                        }
                )
            }

            // OVERLAY TELA CHEIA (Modernizado conforme solicitação)
            AnimatedVisibility(
                visible = isFullScreen && showOverlay,
                enter = fadeIn(animationSpec = tween(400)),
                exit = fadeOut(animationSpec = tween(600)),
                modifier = Modifier.align(Alignment.BottomCenter)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(90.dp)
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.8f))
                            )
                        )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Logo 48dp
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current)
                                .data(channel.streamIcon)
                                .crossfade(200)
                                .build(),
                            contentDescription = null,
                            modifier = Modifier
                                .size(48.dp)
                                .clip(RoundedCornerShape(8.dp)),
                            contentScale = ContentScale.Fit
                        )

                        Spacer(modifier = Modifier.width(12.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            // Linha 1: Numero + Nome e Data/Hora + Badge
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "${channel.num}",
                                        color = Color(0xFFAAAAAA),
                                        fontSize = 14.sp
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = channel.name,
                                        color = Color.White,
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    // Badge AO VIVO pulsando
                                    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
                                    val dotAlpha by infiniteTransition.animateFloat(
                                        initialValue = 1f,
                                        targetValue = 0.3f,
                                        animationSpec = infiniteRepeatable(
                                            animation = tween(800),
                                            repeatMode = RepeatMode.Reverse
                                        ),
                                        label = "dotAlpha"
                                    )
                                    
                                    Text(
                                        text = "● AO VIVO",
                                        color = Color.Red.copy(alpha = dotAlpha),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    
                                    Spacer(modifier = Modifier.width(12.dp))
                                    
                                    Text(
                                        text = currentTime,
                                        color = Color(0xFFCCCCCC),
                                        fontSize = 13.sp
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(4.dp))

                            // Linha 2: Atual e Próximo
                            val currentEpg = epgList.firstOrNull()
                            val nextEpg = epgList.getOrNull(1)
                            
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (currentEpg != null) {
                                    Text(
                                        text = buildAnnotatedString {
                                            withStyle(SpanStyle(color = Color(0xFF888888))) { append("Atual: ") }
                                            withStyle(SpanStyle(color = Color.White)) { append(decodificarTitulo(currentEpg.title)) }
                                        },
                                        fontSize = 13.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.weight(1f, fill = false)
                                    )
                                } else {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                                
                                if (nextEpg != null) {
                                    Text(
                                        text = buildAnnotatedString {
                                            withStyle(SpanStyle(color = Color(0xFF888888))) { append("Próximo: ") }
                                            withStyle(SpanStyle(color = Color(0xFF888888))) { append(decodificarTitulo(nextEpg.title)) }
                                        },
                                        fontSize = 12.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.padding(start = 16.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun OverlayMenuItem(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    
    Surface(
        onClick = { },
        interactionSource = interactionSource,
        color = if (isFocused) Color(0xFF333333) else Color.Transparent,
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.padding(horizontal = 4.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = label,
                color = Color.White,
                fontSize = 13.sp
            )
        }
    }
}

