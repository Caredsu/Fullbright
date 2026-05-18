# Environment Setup Guide

Complete step-by-step guide to set up your development environment.

## Prerequisites

- Windows 10/11 (or Mac/Linux)
- 8GB+ RAM recommended
- 5GB+ free disk space
- Internet connection

---

## 1️⃣ Install Flutter SDK

### Step 1: Download Flutter

1. Go to: https://flutter.dev/docs/get-started/install/windows
2. Download Flutter SDK (stable channel)
3. Extract to: `C:\flutter\` or `D:\flutter\`
   - ⚠️ Do NOT use path with spaces or special chars

### Step 2: Add Flutter to PATH

**Windows (Cmd as Administrator):**

```bash
setx PATH "%PATH%;C:\flutter\bin"
```

Or manually:
1. Press `Win + X` → "System"
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "User variables" → New
5. Variable name: `Path`
6. Variable value: `C:\flutter\bin`
7. Click OK

### Step 3: Verify Installation

```bash
flutter --version
flutter doctor
```

Expected output:
```
Flutter 3.x.x
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, ...)
```

---

## 2️⃣ Install Android SDK

### Option A: Using Android Studio (Recommended)

1. Download: https://developer.android.com/studio
2. Run installer → Click "Install"
3. Launch Android Studio
4. **SDK Manager** → Click "Configure"
5. Install:
   - Android SDK Platform 34 (latest)
   - Android SDK Build-Tools 34.0.0
   - Android SDK Platform-Tools
   - Android Emulator (optional)

### Option B: Command Line

```bash
# Set ANDROID_SDK_ROOT
setx ANDROID_SDK_ROOT C:\Android\sdk

# Add to PATH
setx PATH "%PATH%;C:\Android\sdk\platform-tools"
```

### Step 4: Accept Licenses

```bash
flutter doctor --android-licenses
```

Press `y` for all licenses.

---

## 3️⃣ Install Java

### Check Java Version

```bash
java -version
```

### If Not Installed

**Windows:**

1. Download JDK 11: https://adoptium.net/
2. Run installer
3. Choose installation path: `C:\Program Files\Java\jdk-11`
4. Accept defaults

**Verify:**
```bash
java -version
javac -version
```

---

## 4️⃣ Set Environment Variables

### Windows (Cmd as Administrator)

```bash
# Flutter SDK path
setx FLUTTER_SDK C:\flutter

# Android SDK path
setx ANDROID_SDK_ROOT C:\Android\sdk

# Java path
setx JAVA_HOME C:\Program Files\Java\jdk-11

# Update PATH
setx PATH "%PATH%;C:\flutter\bin;C:\Android\sdk\platform-tools;C:\Program Files\Java\jdk-11\bin"
```

---

## 5️⃣ Install VS Code (Optional but Recommended)

1. Download: https://code.visualstudio.com/
2. Run installer
3. Open VS Code
4. Install extensions:
   - "Flutter" by Dart Code
   - "Dart" by Dart Code
   - "Android Studio Emulator" (optional)
5. Restart VS Code

---

## 6️⃣ Set Up Project

### Clone Project

```bash
cd c:\xampp\htdocs\teacher-eval\flutter_mobile
```

### Get Dependencies

```bash
flutter pub get
```

Expected output:
```
Running "flutter pub get" in teacher_eval_mobile...
Resolving dependencies...
Got dependencies!
```

---

## 7️⃣ Connect Device or Start Emulator

### Option A: USB Connected Phone

1. Connect Android phone via USB
2. Enable Developer Mode:
   - Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back, find "Developer options"
   - Enable "USB Debugging"
3. Allow USB access when prompted
4. Check connection:
   ```bash
   adb devices
   ```

### Option B: Android Emulator

In Android Studio:
1. Click **AVD Manager**
2. Click **Create Virtual Device**
3. Select phone (Pixel 4 recommended)
4. Select Android version (API 30+)
5. Click **Finish**
6. Click play icon to start emulator
7. Wait for boot (~2-3 min)
8. Check connection:
   ```bash
   flutter devices
   ```

---

## 8️⃣ Test Setup

### Verify Everything Works

```bash
flutter doctor
```

Should show all ✓:
```
[✓] Flutter (Channel stable, 3.x.x)
[✓] Android SDK (API 34)
[✓] Android Studio
[✓] VS Code
[✓] Connected devices (1)
```

### Run Test App

```bash
flutter run
```

Should:
- Build APK
- Install on device
- Show "Hello World" app
- Enable hot reload (press `R` in terminal)

---

## 9️⃣ Configure Project

### Set API URL

**File:** `lib/services/api_service.dart`

Change:
```dart
static const String baseUrl = 'http://127.0.0.1';
```

To your server (find IP):
```bash
# Windows Command Prompt
ipconfig

# Look for "IPv4 Address: 192.168.x.x"
```

Update:
```dart
static const String baseUrl = 'http://192.168.1.100';  // Your IP
```

---

## 🔟 Build APK

### Debug Build (Fast)

```bash
flutter build apk
```

Output: `build/app/outputs/flutter-apk/app-debug.apk`

### Release Build (Optimized)

```bash
flutter build apk --release
```

Output: `build/app/outputs/flutter-apk/app-release.apk`

---

## ✅ Complete Setup Checklist

- [ ] Flutter SDK installed
- [ ] Android SDK installed
- [ ] Java JDK installed
- [ ] Environment variables set
- [ ] `flutter doctor` shows all ✓
- [ ] Device/emulator connected
- [ ] `flutter run` works
- [ ] Project API URL configured
- [ ] First APK builds successfully

---

## 🆘 Troubleshooting Setup

### "flutter: command not found"
```bash
# Restart terminal or:
set PATH=%PATH%;C:\flutter\bin
```

### "Android SDK not found"
```bash
flutter config --android-sdk-path C:\Android\sdk
```

### "No Android SDK found"
- Ensure Android Studio is installed
- Run SDK Manager to install platforms

### "Device not detected"
```bash
adb kill-server
adb start-server
adb devices
```

### Emulator won't start
- Check Intel Virtualization enabled in BIOS
- Or download different system image

### "Gradle build failed"
```bash
flutter clean
flutter pub get
flutter build apk
```

---

## 📚 Project Structure

After setup, your files are at:
```
c:\xampp\htdocs\teacher-eval\flutter_mobile\
├── lib/                    # Your code here
├── android/                # Android config
├── build/                  # Build outputs
├── pubspec.yaml            # Dependencies
└── README.md               # Documentation
```

---

## 🚀 Next Steps

1. ✅ Complete environment setup
2. 📖 Read `QUICKSTART.md`
3. 🔧 Configure `api_service.dart`
4. 🏗️ Build APK: `flutter build apk --release`
5. 📱 Install on device
6. 🧪 Test all features
7. 📊 See `TESTING.md` for validation

---

## 💡 Tips

**Speed up builds:**
- Use `--fast-start` for debug builds
- Cold start: `flutter run`
- Hot reload: Press `R` in terminal

**Monitor performance:**
- `flutter run -v` for verbose output
- `flutter logs` for app logs
- DevTools: `flutter pub global activate devtools`

**Keep updated:**
```bash
flutter channel stable
flutter upgrade
flutter pub upgrade
```

---

**Environment setup complete!** 🎉

You're ready to develop and build your Flutter app!
