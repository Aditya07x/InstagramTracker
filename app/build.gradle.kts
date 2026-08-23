plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ksp)
    id("com.chaquo.python")
    alias(libs.plugins.google.firebase.appdistribution)
    alias(libs.plugins.google.gms.google.services)
}

android {
    namespace = "com.example.instatracker"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.instatracker"
        minSdk = 26
        targetSdk = 34
        versionCode = 3
        versionName = "1.2"
        
        ndk {
            abiFilters.add("arm64-v8a")
            abiFilters.add("x86_64")
        }
    }

    signingConfigs {
        create("release") {
            val envPath = System.getenv("KEYSTORE_PATH")
            val keystoreFile = if (!envPath.isNullOrBlank()) {
                val f = File(envPath)
                if (f.isAbsolute) f else rootProject.file(envPath)
            } else {
                file("release.keystore")
            }
            if (keystoreFile.exists()) {
                storeFile = keystoreFile
                storePassword = System.getenv("KEYSTORE_PASSWORD") ?: "android"
                keyAlias = System.getenv("KEY_ALIAS") ?: "reelio"
                keyPassword = System.getenv("KEY_PASSWORD") ?: "android"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            val envPath = System.getenv("KEYSTORE_PATH")
            val keystoreFile = if (!envPath.isNullOrBlank()) {
                val f = File(envPath)
                if (f.isAbsolute) f else rootProject.file(envPath)
            } else {
                file("release.keystore")
            }
            if (keystoreFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }

            configure<com.google.firebase.appdistribution.gradle.AppDistributionExtension> {
                appId = "1:139920054733:android:2d885a6bebeb65aa0a4c84"
                artifactType = "APK"
                val credsEnv = System.getenv("GOOGLE_APPLICATION_CREDENTIALS")
                val credsFile = if (!credsEnv.isNullOrBlank()) File(credsEnv) else rootProject.file("firebase_credentials.json")
                if (credsFile.exists()) {
                    serviceCredentialsFile = credsFile.absolutePath
                }
                testers = System.getenv("FIREBASE_TESTERS") ?: "testers"
                releaseNotes = System.getenv("RELEASE_NOTES") ?: "Automated build from CircleCI"
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
    }
}

// Configure Chaquopy 15 Kotlin DSL structure
chaquopy {
    defaultConfig {
        version = "3.8"
        pyc {
            src = false
            pip = false
        }
        pip {
            install("numpy")
            install("pandas")
            install("scipy")
            install("reportlab")
        }
    }
}

dependencies {

    val roomVersion = "2.6.1"
    val coroutinesVersion = "1.7.3"

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:$coroutinesVersion")

    // Room
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")

    // WorkManager for scheduled tasks
    implementation("androidx.work:work-runtime-ktx:2.9.1")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}
