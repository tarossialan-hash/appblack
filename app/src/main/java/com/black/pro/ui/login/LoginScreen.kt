package com.black.pro.ui.login

import android.app.Activity
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.key.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import coil.compose.AsyncImage
import com.black.pro.R
import com.black.pro.ui.components.ExitDialog
import kotlinx.coroutines.delay

@Composable
fun LoginScreen(
    onLoginSuccess: (String, String) -> Unit
) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    var activeField by remember { mutableStateOf<String?>(null) } 
    var showKeyboard by remember { mutableStateOf(false) }
    var showExitDialog by remember { mutableStateOf(false) }
    
    val context = LocalContext.current
    val usernameFocusRequester = remember { FocusRequester() }
    val passwordFocusRequester = remember { FocusRequester() }
    val loginButtonFocusRequester = remember { FocusRequester() }
    val keyboardFirstKeyFocusRequester = remember { FocusRequester() }

    val attemptLogin = {
        if (username.isNotBlank() && password.isNotBlank()) {
            errorMessage = null
            isLoading = true
            onLoginSuccess(username, password)
            // Timeout de segurança para não carregar infinito se a rede falhar silenciosamente
            // (A lógica real de erro deve vir do ViewModel, mas isso previne o travamento total)
        } else {
            errorMessage = "Preencha todos os campos"
        }
    }

    // Monitora falha de sincronização via delay (caso o callback de sucesso nunca venha)
    LaunchedEffect(isLoading) {
        if (isLoading) {
            delay(15000) // 15 segundos de timeout
            if (isLoading) {
                isLoading = false
                errorMessage = "Erro de conexão ou tempo esgotado"
            }
        }
    }

    BackHandler {
        if (showKeyboard) showKeyboard = false else showExitDialog = true
    }

    if (showExitDialog) {
        ExitDialog(
            onConfirm = { (context as? Activity)?.finishAffinity() },
            onDismiss = { showExitDialog = false }
        )
    }

    LaunchedEffect(Unit) {
        delay(300)
        try {
            usernameFocusRequester.requestFocus()
        } catch (_: Exception) {
            // Silenciosamente falha
        }
    }

    LaunchedEffect(showKeyboard) {
        if (showKeyboard) {
            delay(150)
            try {
                keyboardFirstKeyFocusRequester.requestFocus()
            } catch (_: Exception) {
                // Silenciosamente falha
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        AsyncImage(
            model = R.drawable.app_background,
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
            alpha = 0.5f
        )

        Row(
            modifier = Modifier.fillMaxSize().padding(horizontal = 64.dp, vertical = 32.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1.3f).fillMaxHeight(), verticalArrangement = Arrangement.Center) {
                AsyncImage(model = R.drawable.logo_black, contentDescription = "BLACK Logo", modifier = Modifier.height(60.dp), alignment = Alignment.CenterStart)
                Spacer(modifier = Modifier.height(32.dp))
                Text(text = "Aplicativo de reprodução para TVs.\nUse suas próprias listas e fontes legais.", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold, lineHeight = 28.sp)
                Spacer(modifier = Modifier.height(24.dp))
                InfoBullet(text = "Não fornecemos, hospedamos ou agregamos conteúdo.")
                InfoBullet(text = "Use apenas mídia que você tem permissão legal para acessar.")
                InfoBullet(text = "Navegação: setas para mover, OK para selecionar, Voltar para retornar.")
                Spacer(modifier = Modifier.height(32.dp))
                Text(text = "Ao continuar, você concorda com os Termos de Uso...", color = Color.White.copy(alpha = 0.5f), fontSize = 12.sp, lineHeight = 18.sp)
                Spacer(modifier = Modifier.height(48.dp))
                DemoButton()
            }

            Spacer(modifier = Modifier.width(64.dp))

            Surface(modifier = Modifier.weight(0.85f).wrapContentHeight(), color = Color(0xFF121214).copy(alpha = 0.9f), shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, Color.White.copy(alpha = 0.1f))) {
                Column(modifier = Modifier.padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    TvTextField(
                        value = username,
                        onValueChange = { username = it },
                        label = "Usuário", 
                        icon = Icons.Default.Person, 
                        focusRequester = usernameFocusRequester, 
                        onFocus = { activeField = "user" }, 
                        onClick = { showKeyboard = true }, 
                        isActive = activeField == "user" && showKeyboard,
                        onEnter = { attemptLogin() }
                    )
                    Spacer(modifier = Modifier.height(20.dp))
                    TvTextField(
                        value = password, 
                        onValueChange = { password = it },
                        label = "Senha", 
                        icon = Icons.Default.Lock, 
                        isPassword = true, 
                        focusRequester = passwordFocusRequester, 
                        onFocus = { activeField = "pass" }, 
                        onClick = { showKeyboard = true }, 
                        isActive = activeField == "pass" && showKeyboard,
                        onEnter = { attemptLogin() }
                    )
                    Spacer(modifier = Modifier.height(32.dp))
                    if (errorMessage != null) { Text(text = errorMessage!!, color = Color.Red, fontSize = 14.sp); Spacer(modifier = Modifier.height(16.dp)) }
                    LoginButton(
                        isLoading = isLoading, 
                        onFocus = { if (!showKeyboard) activeField = null }, 
                        onClick = { attemptLogin() }, 
                        focusRequester = loginButtonFocusRequester
                    )
                    Spacer(modifier = Modifier.height(32.dp)); HintsRow()
                }
            }
        }

        if (showKeyboard && activeField != null) {
            Box(modifier = Modifier.fillMaxSize().zIndex(100f), contentAlignment = Alignment.BottomCenter) {
                VirtualKeyboard(
                    firstKeyFocusRequester = keyboardFirstKeyFocusRequester,
                    onKeyClick = { char -> if (activeField == "user") username += char else password += char },
                    onBackspace = { if (activeField == "user") { if (username.isNotEmpty()) username = username.dropLast(1) } else { if (password.isNotEmpty()) password = password.dropLast(1) } },
                    onClear = { if (activeField == "user") username = "" else password = "" },
                    onDone = { showKeyboard = false; if (activeField == "user") passwordFocusRequester.requestFocus() else loginButtonFocusRequester.requestFocus() }
                )
            }
        }
        Text(text = "Versão 1.0.0", color = Color.White.copy(alpha = 0.3f), modifier = Modifier.align(Alignment.BottomEnd).padding(32.dp), fontSize = 12.sp)
    }
}

@Composable
fun TvTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    icon: ImageVector,
    focusRequester: FocusRequester,
    onFocus: () -> Unit,
    onClick: () -> Unit,
    isActive: Boolean = false,
    isPassword: Boolean = false,
    onEnter: () -> Unit = {}
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier
            .fillMaxWidth()
            .focusRequester(focusRequester)
            .onFocusChanged { if (it.isFocused) onFocus() }
            .onKeyEvent {
                if (it.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_ENTER ||
                    it.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_NUMPAD_ENTER ||
                    it.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_DPAD_CENTER) {
                    if (it.type == KeyEventType.KeyUp) {
                        onEnter()
                    }
                    true
                } else false
            },
        textStyle = TextStyle(color = Color.White, fontSize = 16.sp),
        keyboardOptions = KeyboardOptions(
            keyboardType = if (isPassword) KeyboardType.Password else KeyboardType.Text,
            imeAction = ImeAction.Next
        ),
        visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
        decorationBox = { innerTextField ->
            Surface(
                onClick = onClick,
                interactionSource = interactionSource,
                color = Color(0xFF1E1E21).copy(alpha = if (isFocused || isActive) 0.8f else 0.4f),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(width = if (isFocused || isActive) 2.dp else 1.dp, color = if (isFocused || isActive) Color(0xFF3498DB) else Color.White.copy(alpha = 0.1f))
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(icon, null, tint = if (isFocused || isActive) Color.White else Color.Gray, modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(16.dp))
                    Box {
                        if (value.isEmpty()) Text(label, color = Color.Gray.copy(alpha = 0.5f), fontSize = 16.sp)
                        innerTextField()
                    }
                }
            }
        }
    )
}

@Composable
fun VirtualKeyboard(firstKeyFocusRequester: FocusRequester, onKeyClick: (String) -> Unit, onBackspace: () -> Unit, onClear: () -> Unit, onDone: () -> Unit) {
    var isNumeric by remember { mutableStateOf(false) }
    var isShift by remember { mutableStateOf(false) }
    val letterRows = listOf(listOf("q", "w", "e", "r", "t", "y", "u", "i", "o", "p"), listOf("a", "s", "d", "f", "g", "h", "j", "k", "l", "/"), listOf("z", "x", "c", "v", "b", "n", "m", "?", "\\"))
    val numericRows = listOf(listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "0"), listOf("@", "#", "$", "%", "&", "-", "+", "(", ")", "/"), listOf("*", "\"", "'", ":", ";", "!", "?", ".", ","))
    val currentRows = if (isNumeric) numericRows else letterRows
    Surface(modifier = Modifier.padding(bottom = 20.dp).width(600.dp).wrapContentHeight(), color = Color(0xFF1A1A1C), shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, Color.White.copy(alpha = 0.1f))) {
        Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            currentRows.forEachIndexed { r, row ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    row.forEachIndexed { c, key ->
                        val displayKey = if (!isNumeric && isShift) key.uppercase() else key
                        KeyButton(text = displayKey, onClick = { onKeyClick(displayKey) }, modifier = if (r == 0 && c == 0) Modifier.focusRequester(firstKeyFocusRequester) else Modifier)
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                KeyButton(text = if (isNumeric) "ABC" else "123", onClick = { isNumeric = !isNumeric }, width = 70.dp)
                if (!isNumeric) KeyButton(text = "⇧", onClick = { isShift = !isShift }, isSelected = isShift, width = 50.dp)
                KeyButton(text = "⌫", onClick = onBackspace, width = 50.dp)
                KeyButton(text = "Espaço", onClick = { onKeyClick(" ") }, width = 180.dp)
                KeyButton(text = "Limpar", onClick = onClear, width = 90.dp, containerColor = Color(0xFFE74C3C))
                KeyButton(text = "✓", onClick = onDone, width = 70.dp, containerColor = Color(0xFF2ECC71))
            }
        }
    }
}

@Composable
fun KeyButton(text: String, onClick: () -> Unit, width: androidx.compose.ui.unit.Dp = 48.dp, containerColor: Color = Color(0xFF2D2D30), isSelected: Boolean = false, modifier: Modifier = Modifier) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    val isPressed by interactionSource.collectIsPressedAsState()
    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        modifier = modifier.size(width = width, height = 48.dp),
        color = when {
            isPressed -> Color(0xFFCCCCCC)
            isFocused -> Color.White
            isSelected -> Color.White.copy(alpha = 0.2f)
            else -> containerColor
        },
        shape = RoundedCornerShape(8.dp)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(text = text, color = if (isFocused || isPressed) Color.Black else Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun LoginButton(isLoading: Boolean, onFocus: () -> Unit, onClick: () -> Unit, focusRequester: FocusRequester) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        modifier = Modifier.fillMaxWidth().height(56.dp).focusRequester(focusRequester).onFocusChanged { if (it.isFocused) onFocus() },
        color = if (isFocused) Color.White else Color.Transparent,
        shape = RoundedCornerShape(8.dp),
        border = if (!isFocused) BorderStroke(1.dp, Color.White) else null
    ) {
        Box(contentAlignment = Alignment.Center) {
            if (isLoading) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = if (isFocused) Color.Black else Color.White)
            else Text("ENTRAR", color = if (isFocused) Color.Black else Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }
    }
}

@Composable
fun DemoButton() {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    Surface(
        onClick = { },
        interactionSource = interactionSource,
        color = if (isFocused) Color.White else Color.Transparent,
        shape = RoundedCornerShape(8.dp),
        border = if (!isFocused) BorderStroke(1.dp, Color.White.copy(alpha = 0.3f)) else null
    ) {
        Text("Demo", color = if (isFocused) Color.Black else Color.White, modifier = Modifier.padding(horizontal = 32.dp, vertical = 12.dp), fontWeight = FontWeight.Bold)
    }
}

@Composable
fun InfoBullet(text: String) {
    Row(modifier = Modifier.padding(vertical = 4.dp)) {
        Text(text = "• ", color = Color.White, fontSize = 16.sp)
        Text(text = text, color = Color.White, fontSize = 16.sp)
    }
}

@Composable
fun HintsRow() {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
        RemoteHint(icon = "OK", text = "edit"); Spacer(modifier = Modifier.width(16.dp))
        RemoteHint(icon = "↵", text = "enter"); Spacer(modifier = Modifier.width(16.dp))
        RemoteHint(icon = "←", text = "back")
    }
}

@Composable
fun RemoteHint(icon: String, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(24.dp).background(Color.White.copy(alpha = 0.1f), RoundedCornerShape(4.dp)), contentAlignment = Alignment.Center) {
            Text(text = icon, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.width(8.dp))
        Text(text = text, color = Color.Gray, fontSize = 13.sp)
    }
}

@androidx.compose.ui.tooling.preview.Preview(device = "id:tv_1080p", widthDp = 1920, heightDp = 1080)
@Composable
fun LoginScreenPreview() {
    MaterialTheme {
        LoginScreen(onLoginSuccess = { _, _ -> })
    }
}
