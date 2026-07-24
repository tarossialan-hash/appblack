import java.io.FileInputStream
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.ksp)
}

// Credenciais da keystore de release — nunca no build.gradle.kts nem no git,
// só neste arquivo local (ignorado pelo .gitignore).
val keystorePropertiesFile = file("keystore.properties")
val temKeystoreDeRelease = keystorePropertiesFile.exists()
val keystoreProperties = Properties().apply {
    if (temKeystoreDeRelease) load(FileInputStream(keystorePropertiesFile))
}

// Todas as versões já publicadas (1.0.1 a 1.0.4) foram assinadas com a chave
// de DEBUG — é o certificado que já está instalado no aparelho de cada
// cliente. Trocar de chave muda a assinatura do pacote com.black.pro, e o
// Android recusa instalar por cima ("conflito com um pacote já existente")
// qualquer atualização assinada com um certificado diferente do que já está
// instalado — não tem meio-termo, o cliente teria que desinstalar o app
// primeiro. Foi exatamente o que aconteceu na 1.0.4.1: assinei com a chave de
// release nova sem perceber essa consequência, e quebrou a atualização pra
// todo mundo que já tinha o app instalado.
//
// Então: ligar isto só numa migração deliberada e avisada com antecedência
// (ex.: junto do envio pra Play Store, onde a instalação já vem de outro
// canal). Enquanto a distribuição for pelo GitHub Release + auto-update
// dentro do próprio app, mantenha false.
val usarKeystoreDeRelease = false

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_11)
    }
}

android {
    namespace = "com.black.pro"
    // media3/ExoPlayer 1.10 exige compileSdk 36+. Isto só muda contra quais
    // APIs o código compila — não afeta o comportamento do app em runtime,
    // diferente de targetSdk (esse continua em 34, deliberadamente).
    compileSdk = 36

    androidResources {
        localeFilters += listOf("pt", "en")
    }

    defaultConfig {
        applicationId = "com.black.pro"
        minSdk = 24
        targetSdk = 34
        versionCode = 10
        versionName = "1.0.5"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Otimização para TV: Focar apenas em arquiteturas ARM (maioria das TVs)
        ndk {
            abiFilters.addAll(listOf("armeabi-v7a", "arm64-v8a"))
        }
    }

    signingConfigs {
        if (temKeystoreDeRelease) {
            create("release") {
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
            }
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            isShrinkResources = false
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true

            // Ver o comentário de usarKeystoreDeRelease acima antes de mexer aqui.
            signingConfig = if (usarKeystoreDeRelease && temKeystoreDeRelease) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }

            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        // Necessário para BuildConfig.DEBUG: no AGP 8+ não é gerado por padrão.
        // Usado para ligar a inspeção da WebView apenas em depuração.
        buildConfig = true
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

// A UI é 100% WebView (assets/index.html), exceto o player de VOD (filme/
// episódio): esse usa ExoPlayer (media3) nativo. O <video> do WebView compõe
// cada quadro numa textura de GPU (SurfaceTexture), e em UHD alguns chips de
// TV box corrompem essa textura (imagem partida ao meio); o ExoPlayer desenha
// direto numa superfície de vídeo dedicada, fora desse caminho — ver
// MainActivity.kt. TV ao vivo continua no <video> do WebView com mpegts.js.
dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)

    implementation(libs.retrofit)
    implementation(libs.retrofit.gson)
    implementation(libs.androidx.security.crypto)
    implementation(libs.media3.exoplayer)
    implementation(libs.media3.ui)

    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}
