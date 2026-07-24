import java.io.FileInputStream
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.ksp)
}

// Credenciais da keystore de release — nunca no build.gradle.kts nem no git,
// só neste arquivo local (ignorado pelo .gitignore). Sem ele, o build de
// release cai pra assinatura de debug (dá pra compilar localmente, mas esse
// APK/AAB não serve pra publicar/atualizar o app na Play Store).
val keystorePropertiesFile = file("keystore.properties")
val temKeystoreDeRelease = keystorePropertiesFile.exists()
val keystoreProperties = Properties().apply {
    if (temKeystoreDeRelease) load(FileInputStream(keystorePropertiesFile))
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_11)
    }
}

android {
    namespace = "com.black.pro"
    compileSdk = 34

    androidResources {
        localeFilters += listOf("pt", "en")
    }

    defaultConfig {
        applicationId = "com.black.pro"
        minSdk = 24
        targetSdk = 34
        versionCode = 8
        versionName = "1.0.4.1"

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

            // Com a keystore.properties (local, fora do git) usa a chave de
            // release de verdade — obrigatória pra publicar/atualizar na Play
            // Store. Sem ela (ex.: outra máquina sem o arquivo), cai pra
            // debug só pra não travar o build local.
            signingConfig = if (temKeystoreDeRelease) {
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

// A UI é 100% WebView (assets/index.html). Nada de Compose, ExoPlayer, Coil ou
// Navigation aqui: o player roda em JS (mpegts.js) e as imagens no próprio HTML.
dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)

    implementation(libs.retrofit)
    implementation(libs.retrofit.gson)
    implementation(libs.androidx.security.crypto)

    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}
