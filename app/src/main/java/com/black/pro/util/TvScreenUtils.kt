package com.black.pro.util

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density

/**
 * Provedor de escala global para TVs.
 * Se a tela reportar poucos DPs (zoom alto), reduzimos a densidade para "ganhar espaço".
 */
@Composable
fun TvScaleProvider(content: @Composable () -> Unit) {
    val configuration = LocalConfiguration.current
    val density = LocalDensity.current

    val screenWidthDp = configuration.screenWidthDp
    val targetScreenWidthDp = 1100f // Alvo de largura para um layout equilibrado
    
    // Evita divisão por zero ou escala nula que causaria crash
    val scaleFactor = if (screenWidthDp in 1 until targetScreenWidthDp.toInt()) {
        screenWidthDp.toFloat() / targetScreenWidthDp
    } else {
        1f
    }

    val customDensity = Density(
        density = density.density * scaleFactor,
        fontScale = density.fontScale
    )

    CompositionLocalProvider(LocalDensity provides customDensity) {
        content()
    }
}
