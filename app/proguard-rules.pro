# BLACK App ProGuard Rules

# 1. Gson / Retrofit Models
# Mantém os modelos de dados para que o Gson consiga mapear o JSON da API
-keep class com.black.pro.data.model.** { *; }
-keep class com.black.pro.data.local.entity.** { *; }

# 2. Room
# Mantém as classes do Room para evitar erros de banco de dados
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-keep class * { @androidx.room.Dao *; }

# 3. Retrofit / OkHttp
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }
-keep class okhttp3.** { *; }

# 4. Ponte JavaScript
# A WebView chama estes metodos por nome a partir do app.js. Sem isto o R8
# renomeia/remove os metodos e o app quebra so no build de release.
-keepclassmembers class com.black.pro.WebAppInterface {
    @android.webkit.JavascriptInterface <methods>;
}

# 5. Tink / Security Crypto (Fix for R8 build errors)
-dontwarn com.google.api.client.http.**
-dontwarn org.joda.time.**
-dontwarn com.google.crypto.tink.util.KeysDownloader
# Anotacoes so de compilacao, ausentes em runtime
-dontwarn com.google.errorprone.annotations.CanIgnoreReturnValue
-dontwarn com.google.errorprone.annotations.CheckReturnValue
-dontwarn com.google.errorprone.annotations.Immutable
-dontwarn com.google.errorprone.annotations.RestrictedApi

