plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
    id("kotlin-android")
}

android {
    namespace = "com.example.teacher_eval_mobile"
    compileSdk = 34
    ndkVersion = flutter.ndkVersion

    defaultConfig {
        applicationId = "com.example.teacher_eval_mobile"
        minSdk = flutter.minSdkVersion
        targetSdk = 34
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        multiDexEnabled = true
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("debug")
        }
        
        debug {
            debuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = "11"
    }
}

flutter {
    source = "../.."
}

dependencies {
    implementation("com.google.firebase:firebase-core:32.3.1")
    implementation("com.google.firebase:firebase-messaging:23.3.1")
    implementation("org.jetbrains.kotlin:kotlin-stdlib:1.9.10")
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.0.3")
}
