plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "app.nobatet"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.nobatet"
        minSdk = 26 // java.time without desugaring; Android 8+
        targetSdk = 35
        // CI sets the build number, so every build installs over the previous one
        versionCode = (System.getenv("NOBATET_VERSION_CODE") ?: "1").toInt()
        versionName = System.getenv("NOBATET_VERSION_NAME") ?: "0.1.0"
        // apps/api behind nginx (/backend/* → api, prefix stripped) and apps/web on the same origin.
        buildConfigField("String", "API_BASE_URL", "\"https://nobatet.app/backend/\"")
        buildConfigField("String", "WEB_BASE_URL", "\"https://nobatet.app/\"")
    }

    // Release signing from the environment (GitHub secrets) — the key itself never enters the repo.
    // Without it the release build comes out unsigned (fine for checking; not installable/publishable).
    val keystore = System.getenv("NOBATET_KEYSTORE_FILE")
    signingConfigs {
        if (keystore != null) create("release") {
            storeFile = file(keystore)
            storePassword = System.getenv("NOBATET_KEYSTORE_PASSWORD")
            keyAlias = System.getenv("NOBATET_KEY_ALIAS")
            keyPassword = System.getenv("NOBATET_KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            if (keystore != null) signingConfig = signingConfigs.getByName("release")
            isShrinkResources = true
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    testOptions {
        // Robolectric needs the merged resources (fonts, the logo) for the poster test
        unitTests.isIncludeAndroidResources = true
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    testImplementation(libs.junit)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.core)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.coil.compose)
    implementation(libs.osmdroid)
    implementation(libs.zxing.core)
    implementation(libs.androidx.work)
    implementation(libs.play.sms)
    implementation(libs.androidx.splash)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
