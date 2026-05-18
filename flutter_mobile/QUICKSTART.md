# Teacher Evaluation Mobile App - Quick Start Guide

## 🚀 Building the APK

### 1. Prerequisites
- **Flutter SDK** installed ([Get Flutter](https://flutter.dev/docs/get-started/install))
- **Android SDK** (comes with Android Studio)
- **Java 11 or higher**

### 2. Verify Flutter Installation
```bash
flutter doctor
```

Should show:
- ✓ Flutter
- ✓ Android SDK
- ✓ Android Studio (or Android toolchain)

### 3. Configure API Connection

**Edit:** `lib/services/api_service.dart`

```dart
static const String baseUrl = 'http://YOUR_API_URL';
```

Options:
- **Local Network:** `http://192.168.1.100` (your computer IP on WiFi)
- **Local Machine:** `http://10.0.2.2` (if running on Android emulator)
- **Production:** `https://yourdomain.com`

### 4. Get Dependencies

```bash
cd flutter_mobile
flutter pub get
```

### 5. Build APK

#### Development APK (Debug)
```bash
flutter build apk
```

#### Production APK (Release)
```bash
flutter build apk --release
```

**Output:** `build/app/outputs/flutter-apk/app-release.apk`

### 6. Install on Device

```bash
flutter install
```

Or manually:
```bash
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

## 📱 App Features

1. **Splash Screen (2 sec)** - Loading animation
2. **Teacher List** - Search, filter, view all teachers
3. **Evaluation Form** - Rate teachers with questions
4. **Submit** - Save evaluation to server

## 🔐 Release Build with Signing

For Google Play Store distribution:

### 1. Create Keystore
```bash
keytool -genkey -v -keystore teacher_eval_keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias teacher_eval_key
```

### 2. Configure key.properties
Copy `android/key.properties.template` → `android/key.properties`

Fill in:
- storePassword: (from step 1)
- keyAlias: teacher_eval_key
- keyPassword: (from step 1)

### 3. Build Signed APK
```bash
flutter build apk --release
```

## 🐛 Troubleshooting

### Error: "Flutter SDK not found"
```bash
flutter config --android-sdk-path "C:\path\to\Android\Sdk"
```

### Error: "Gradle build failed"
```bash
flutter clean
flutter pub get
flutter build apk --release
```

### App crashes on startup
1. Check `api_service.dart` - is API URL correct?
2. Is your PHP server running?
3. Check logcat: `flutter logs`

### APK install fails
```bash
adb uninstall com.example.teacher_eval_mobile
adb install build/app/outputs/flutter-apk/app-release.apk
```

## 📊 Testing

### Run on Physical Device
```bash
flutter devices  # See connected devices
flutter run
```

### Run on Emulator
```bash
flutter run -d emulator-5554
```

### Real-time Logs
```bash
flutter logs
```

## 📦 App Information

- **Package Name:** com.example.teacher_eval_mobile
- **Min SDK:** 21 (Android 5.0)
- **Target SDK:** 34 (Android 14)
- **Languages:** Dart (Flutter)

## 🎨 Customization

### Change App Name
1. `android/app/src/main/AndroidManifest.xml` - Line: `android:label="@string/app_name"`
2. `android/app/src/main/res/values/strings.xml` - Add/edit `<string name="app_name">Your App Name</string>`

### Change Colors
Edit `lib/main.dart`:
```dart
primaryColor: const Color(0xFF1976D2),  // Change this
```

### Change App Icon
1. Place icon at: `android/app/src/main/res/mipmap-*/ic_launcher.png`
2. Rebuild: `flutter build apk --release`

## 📲 Distribution

### Google Play Store
1. Sign APK (see Release Build section)
2. Create Google Play Developer account
3. Upload APK to Play Store
4. Set up store listing
5. Submit for review

### Direct Distribution
- Share `app-release.apk` directly
- Users can install: `adb install app-release.apk`

## 🆘 Support

Check logs:
```bash
flutter logs -c
```

Check device connectivity:
```bash
adb devices
```

Reinstall:
```bash
flutter clean
flutter pub get
flutter build apk --release
```

---

**Next:** Build APK → Test on device → Customize → Publish! 🎉
