package com.black.pro.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog

@Composable
fun ExitDialog(onConfirm: () -> Unit, onDismiss: () -> Unit) {
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = Color(0xFF1E1E21),
            tonalElevation = 8.dp
        ) {
            Column(
                modifier = Modifier.padding(32.dp).width(320.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                Text(
                    text = "Sair do Aplicativo",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Deseja realmente fechar o BLACK?",
                    fontSize = 16.sp,
                    color = Color.White.copy(alpha = 0.7f)
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    var isNoFocused by remember { mutableStateOf(false) }
                    Button(
                        onClick = onDismiss,
                        modifier = Modifier
                            .weight(1f)
                            .focusRequester(focusRequester)
                            .onFocusChanged { isNoFocused = it.isFocused },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isNoFocused) Color.White else Color.White.copy(alpha = 0.1f),
                            contentColor = if (isNoFocused) Color.Black else Color.White
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Não", fontWeight = FontWeight.Bold)
                    }

                    var isYesFocused by remember { mutableStateOf(false) }
                    Button(
                        onClick = onConfirm,
                        modifier = Modifier
                            .weight(1f)
                            .onFocusChanged { isYesFocused = it.isFocused },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isYesFocused) Color.White else Color.White.copy(alpha = 0.1f),
                            contentColor = if (isYesFocused) Color.Black else Color.White
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Sim", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
