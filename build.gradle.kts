plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.ksp) apply false
    id("com.chaquo.python") version "16.1.0" apply false
    alias(libs.plugins.google.firebase.appdistribution) apply false
    alias(libs.plugins.google.gms.google.services) apply false
}

