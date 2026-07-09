package com.black.pro.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.zIndex
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.black.pro.R

@Composable
fun MainContainer(
    navController: NavController,
    viewModel: IPTVViewModel,
    onLogout: () -> Unit,
    onSync: () -> Unit,
    content: @Composable () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        // O conteúdo (HomeScreen) agora gerencia sua própria rolagem e menu
        Box(modifier = Modifier
            .fillMaxSize()
            .then(if (viewModel.isSyncing) Modifier.onKeyEvent { true } else Modifier) // CAPTURA TODAS AS TECLAS DURANTE SYNC
        ) {
            content()
        }

        // SYNC OVERLAY - Único elemento que deve sobrepor o foco durante o carregamento
        if (viewModel.showSyncOverlay) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .zIndex(200f)
                    .background(Color.Black)
                    .focusable() // TORNA O OVERLAY FOCO-AVEL PARA "ROUBAR" O FOCO DOS ELEMENTOS ATRÁS
            ) {
                AsyncImage(
                    model = R.drawable.app_background,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                    alpha = 0.5f
                )

                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.logo_black),
                        contentDescription = null,
                        modifier = Modifier.height(80.dp),
                        contentScale = ContentScale.Fit
                    )
                    Spacer(modifier = Modifier.height(32.dp))
                    Text(
                        text = viewModel.syncStatus,
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    LinearProgressIndicator(
                        progress = { viewModel.syncProgress },
                        modifier = Modifier
                            .width(300.dp)
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp)),
                        color = Color.White,
                        trackColor = Color.DarkGray
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "${(viewModel.syncProgress * 100).toInt()}%",
                        color = Color.Gray,
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}
