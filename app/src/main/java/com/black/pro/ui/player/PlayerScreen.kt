package com.black.pro.ui.player

import android.util.Log
import android.widget.Toast
import androidx.annotation.OptIn
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.zIndex
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import java.util.Locale
import java.util.concurrent.TimeUnit
import kotlin.time.Duration.Companion.seconds

@OptIn(UnstableApi::class)
@Composable
fun PlayerScreen(
    streamUrl: String,
    title: String = "",
    logoUrl: String = "",
    overview: String = "",
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val TAG = "ExoPlayerDebug"

    var isPlaying by remember { mutableStateOf(false) }
    var currentPosition by remember { mutableLongStateOf(0L) }
    var duration by remember { mutableLongStateOf(0L) }
    var isControlsVisible by remember { mutableStateOf(true) }
    var isSynopsisVisible by remember { mutableStateOf(false) }
    
    val playPauseFocusRequester = remember { FocusRequester() }

    val exoPlayer = remember {
        ExoPlayer.Builder(context)
            .setLoadControl(DefaultLoadControl.Builder()
                .setBufferDurationsMs(15_000, 50_000, 1_500, 2_500)
                .build())
            .build().apply {
                playWhenReady = true
                addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(state: Int) {
                        if (state == Player.STATE_READY) {
                            duration = this@apply.duration
                        }
                    }
                    override fun onPlayerError(error: PlaybackException) {
                        Toast.makeText(context, "Erro: ${error.message}", Toast.LENGTH_LONG).show()
                    }
                    override fun onIsPlayingChanged(playing: Boolean) {
                        isPlaying = playing
                    }
                })
            }
    }

    // Auto-hide controls
    LaunchedEffect(isControlsVisible, isSynopsisVisible) {
        if (isControlsVisible && !isSynopsisVisible) {
            delay(8.seconds)
            isControlsVisible = false
        }
    }
    
    // Force focus
    LaunchedEffect(isControlsVisible) {
        if (isControlsVisible) {
            try { playPauseFocusRequester.requestFocus() } catch (_: Exception) {}
        }
    }

    LaunchedEffect(isPlaying) {
        while (isPlaying) {
            currentPosition = exoPlayer.currentPosition
            delay(1000)
        }
    }

    LaunchedEffect(streamUrl) {
        exoPlayer.setMediaItem(MediaItem.fromUri(streamUrl))
        exoPlayer.prepare()
        exoPlayer.play()
    }

    DisposableEffect(Unit) {
        onDispose {
            exoPlayer.stop()
            exoPlayer.release()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .onKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyUp) {
                    if (isSynopsisVisible) {
                        isSynopsisVisible = false
                        true
                    } else if (!isControlsVisible) {
                        isControlsVisible = true
                        true
                    } else {
                        false
                    }
                } else false
            }
    ) {
        AndroidView(
            factory = {
                PlayerView(context).apply {
                    player = exoPlayer
                    useController = false
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Overlay do Player
        AnimatedVisibility(visible = isControlsVisible, enter = fadeIn(), exit = fadeOut()) {
            Box(modifier = Modifier.fillMaxSize()) {
                
                // Barra Superior
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp)
                        .align(Alignment.TopCenter),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    PlayerControlIcon(Icons.AutoMirrored.Filled.ArrowBack) { onBack() }
                    Text(
                        "Pressione Voltar para fechar",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 12.sp,
                        modifier = Modifier.padding(start = 4.dp)
                    )
                    
                    Spacer(modifier = Modifier.weight(1f))
                    
                    Text(
                        text = title,
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    
                    Spacer(modifier = Modifier.weight(1f))
                }

                // Logo Lateral
                if (logoUrl.isNotEmpty() && !isSynopsisVisible) {
                    AsyncImage(
                        model = "https://image.tmdb.org/t/p/w500$logoUrl",
                        contentDescription = null,
                        modifier = Modifier
                            .align(Alignment.CenterStart)
                            .padding(start = 64.dp)
                            .height(100.dp)
                            .widthIn(max = 250.dp),
                        contentScale = ContentScale.Fit
                    )
                }

                // Card de Sinopse (Opcional ao clicar em Info)
                AnimatedVisibility(
                    visible = isSynopsisVisible,
                    enter = fadeIn(),
                    exit = fadeOut(),
                    modifier = Modifier.align(Alignment.CenterStart).padding(start = 64.dp, end = 300.dp)
                ) {
                    Surface(
                        color = Color.Black.copy(alpha = 0.8f),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.widthIn(max = 500.dp)
                    ) {
                        Column(modifier = Modifier.padding(24.dp)) {
                            Text(
                                text = "Sinopse",
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = overview.ifEmpty { "Nenhuma sinopse disponível." },
                                color = Color.White.copy(alpha = 0.9f),
                                fontSize = 14.sp,
                                lineHeight = 20.sp,
                                maxLines = 8,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }

                // Barra Inferior
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.8f))))
                        .padding(horizontal = 48.dp, vertical = 32.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Controles à esquerda
                        PlayerControlIcon(Icons.AutoMirrored.Filled.ArrowBack) { 
                            exoPlayer.seekBack()
                            isControlsVisible = true
                        }
                        
                        Spacer(modifier = Modifier.width(12.dp))
                        
                        PlayerControlIcon(
                            icon = if (isPlaying) Icons.Default.Close else Icons.Default.PlayArrow,
                            modifier = Modifier.focusRequester(playPauseFocusRequester)
                        ) {
                            if (isPlaying) exoPlayer.pause() else exoPlayer.play()
                            isControlsVisible = true
                        }
                        
                        Spacer(modifier = Modifier.width(12.dp))
                        
                        PlayerControlIcon(Icons.Default.ArrowForward) {
                            exoPlayer.seekForward()
                            isControlsVisible = true
                        }
                        
                        Spacer(modifier = Modifier.width(20.dp))
                        
                        Text(
                            text = formatTime(currentPosition),
                            color = Color.White,
                            fontSize = 14.sp
                        )
                        
                        // Slider / Barra de Progresso - Tornar focável e navegável
                        val sliderFocusRequester = remember { FocusRequester() }
                        Slider(
                            value = if (duration > 0) currentPosition.toFloat() / duration else 0f,
                            onValueChange = { exoPlayer.seekTo((it * duration).toLong()) },
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 16.dp)
                                .focusRequester(sliderFocusRequester)
                                .onKeyEvent {
                                    if (it.type == KeyEventType.KeyDown) {
                                        when (it.key) {
                                            Key.DirectionLeft -> {
                                                exoPlayer.seekBack()
                                                true
                                            }
                                            Key.DirectionRight -> {
                                                exoPlayer.seekForward()
                                                true
                                            }
                                            else -> false
                                        }
                                    } else false
                                },
                            colors = SliderDefaults.colors(
                                thumbColor = Color.White,
                                activeTrackColor = Color.Red,
                                inactiveTrackColor = Color.White.copy(alpha = 0.3f)
                            )
                        )
                        
                        Text(
                            text = "-${formatTime(duration - currentPosition)}",
                            color = Color.White,
                            fontSize = 14.sp
                        )
                        
                        Spacer(modifier = Modifier.width(20.dp))
                        
                        PlayerControlIcon(Icons.Default.Info, size = 22.dp) {
                            isSynopsisVisible = !isSynopsisVisible
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PlayerControlIcon(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier,
    size: androidx.compose.ui.unit.Dp = 28.dp,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    
    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        color = if (isFocused) Color.White.copy(alpha = 0.3f) else Color.Transparent,
        shape = CircleShape,
        modifier = modifier.size(size + 12.dp)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(size)
            )
        }
    }
}

private fun formatTime(ms: Long): String {
    val hours = TimeUnit.MILLISECONDS.toHours(ms)
    val minutes = TimeUnit.MILLISECONDS.toMinutes(ms) % 60
    val seconds = TimeUnit.MILLISECONDS.toSeconds(ms) % 60
    return if (hours > 0) {
        String.format(Locale.getDefault(), "%02d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds)
    }
}
