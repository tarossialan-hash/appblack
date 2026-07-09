package com.black.pro.ui.category

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import coil.compose.AsyncImage
import com.black.pro.data.model.Category
import com.black.pro.data.model.Movie
import com.black.pro.data.model.Series
import com.black.pro.util.FavoritosManager
import kotlinx.coroutines.delay

@Composable
fun VodContentScreen(
    type: String,
    categories: List<Category>,
    movies: List<Movie> = emptyList(),
    series: List<Series> = emptyList(),
    selectedCategory: Category? = null,
    onCategorySelect: (Category) -> Unit,
    onMovieClick: (Movie) -> Unit,
    onSeriesClick: (Series) -> Unit
) {
    val firstCategoryFocusRequester = remember { FocusRequester() }
    val gridState = rememberLazyGridState()
    
    // Sincroniza seleção inicial apenas se não houver uma selecionada globalmente
    LaunchedEffect(categories) {
        if (selectedCategory == null && categories.isNotEmpty()) {
            val initialCategory = categories.first()
            onCategorySelect(initialCategory)
            delay(300)
            try {
                firstCategoryFocusRequester.requestFocus()
            } catch (_: Exception) {}
        }
    }

    // Ao mudar de categoria, volta o grid para o topo
    LaunchedEffect(selectedCategory) {
        gridState.scrollToItem(0)
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF121212))
    ) {
        // COLUNA 1: CATEGORIAS (25%) - Idêntica à TV ao Vivo
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

        // COLUNA 2: GRID DE CONTEÚDO (75%)
        Surface(
            modifier = Modifier
                .fillMaxHeight()
                .weight(0.75f),
            color = Color(0xFF141414)
        ) {
            LazyVerticalGrid(
                state = gridState,
                columns = GridCells.Fixed(6), // Aumentado para 6 colunas para ficar mais esguio
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (type == "movie") {
                    itemsIndexed(movies) { _, movie ->
                        VodPosterCard(
                            id = movie.streamId,
                            type = "movie",
                            name = movie.name,
                            imageUrl = movie.streamIcon,
                            onClick = { onMovieClick(movie) }
                        )
                    }
                } else {
                    itemsIndexed(series) { _, s ->
                        VodPosterCard(
                            id = s.seriesId,
                            type = "series",
                            name = s.name,
                            imageUrl = s.cover,
                            onClick = { onSeriesClick(s) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun VodPosterCard(id: Int, type: String, name: String, imageUrl: String?, onClick: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    val context = LocalContext.current
    val isFavorite = remember { FavoritosManager.isFavorito(context, id, type) }
    
    val scale by animateFloatAsState(
        targetValue = if (isFocused) 1.05f else 1.0f,
        animationSpec = tween(durationMillis = 150),
        label = "scale"
    )

    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        modifier = Modifier
            .aspectRatio(0.67f) // Força proporção 2:3 vertical (esguia)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .zIndex(if (isFocused) 1f else 0f),
        color = Color(0xFF1E1E21),
        shape = RoundedCornerShape(6.dp),
        border = if (isFocused) BorderStroke(2.dp, Color.White) else null
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            AsyncImage(
                model = imageUrl,
                contentDescription = name,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )

            // Faixa preta na base conforme anexo 1
            Surface(
                color = Color.Black.copy(alpha = 0.7f),
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .height(35.dp)
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
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
            
            if (isFavorite) {
                Icon(
                    imageVector = Icons.Default.Favorite,
                    contentDescription = null,
                    tint = Color(0xFFE53935),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(4.dp)
                        .size(14.dp)
                )
            }
        }
    }
}
