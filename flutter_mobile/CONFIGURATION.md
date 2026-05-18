# Teacher Evaluation Mobile App - Configuration Guide

## API Configuration

### Location: `lib/services/api_service.dart`

```dart
static const String baseUrl = 'http://127.0.0.1';
```

### For Different Environments:

#### 1. Local Development (Same Machine)
```dart
static const String baseUrl = 'http://127.0.0.1';  // Windows
// or
static const String baseUrl = 'http://localhost';
```

#### 2. Local Network (From Another Device)
```dart
// Find your PC's IP: Open cmd → ipconfig
// Look for "IPv4 Address: 192.168.x.x" or similar

static const String baseUrl = 'http://192.168.1.100';  // Your PC IP
```

#### 3. Android Emulator (Testing)
```dart
// Emulator can reach host via special IP
static const String baseUrl = 'http://10.0.2.2';  // Android emulator default
```

#### 4. Production Server
```dart
static const String baseUrl = 'https://yourdomain.com';
static const String baseUrl = 'https://api.yourdomain.com';
```

---

## App Customization

### 1. Change App Name

**File:** `android/app/src/main/res/values/strings.xml`
```xml
<string name="app_name">My Evaluation App</string>
```

**File:** `pubspec.yaml`
```yaml
name: my_evaluation_app
```

### 2. Change Primary Color

**File:** `lib/main.dart`
```dart
theme: ThemeData(
  primaryColor: const Color(0xFF1976D2),  // Change hex code
  useMaterial3: true,
),
```

**File:** `android/app/src/main/res/values/colors.xml`
```xml
<color name="primary">#FF0000</color>
```

### 3. Change App Icon

1. Create icon image (recommended: 512x512px or larger)
2. Use Android Studio: **right-click android/app → New → Image Asset**
3. Or manually place in:
   - `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
   - `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
   - `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
   - `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)

### 4. Change Splash Screen Logo

Edit `lib/screens/splash_screen.dart`:
```dart
Icon(
  Icons.school,  // Change icon
  size: 60,
  color: Colors.white,
),
```

### 5. Change API Timeout

**File:** `lib/services/api_service.dart`
```dart
static const Duration timeout = Duration(seconds: 30);  // Change value
```

---

## Permissions Configuration

**File:** `android/app/src/main/AndroidManifest.xml`

Current permissions:
- `INTERNET` - Required for API calls
- `ACCESS_NETWORK_STATE` - Check network connectivity
- `CAMERA` - Future: profile picture upload
- `READ_EXTERNAL_STORAGE` - Future: file upload

Add more if needed:
```xml
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

---

## Build Configuration

### Min API Level
**File:** `pubspec.yaml` and `android/app/build.gradle`
```gradle
minSdk = 21  // Android 5.0+
targetSdk = 34  // Android 14
```

### Version Management
**File:** `pubspec.yaml`
```yaml
version: 1.0.0+1
```
- First number (1.0.0) = Display version
- Second number (+1) = Build number

Update for releases:
```yaml
version: 1.1.0+2  # v1.1, build 2
```

---

## Feature Toggles

### Disable Features (Temporarily)

#### Hide Feedback Comments
**File:** `lib/screens/evaluation_screen.dart`
Comment out this section:
```dart
// // Feedback Comments
// const SizedBox(height: 8),
// const Text('Additional Comments (Optional)', ...),
```

#### Disable Search
**File:** `lib/screens/teacher_list_screen.dart`
Comment out search field:
```dart
// Container(
//   padding: const EdgeInsets.all(16),
//   color: const Color(0xFF1976D2),
//   child: TextField(...),
// ),
```

---

## Advanced Configuration

### Firebase Integration (Optional)

1. Replace `google-services.json` with your project's file
2. Uncomment Firebase dependencies in `pubspec.yaml`
3. Add messaging listener in `main.dart`

### Offline Mode

Already included with HTTP error handling. To add local caching:

1. Add `sqflite` to `pubspec.yaml`
2. Create models in `lib/models/local_db.dart`
3. Implement caching in `lib/services/api_service.dart`

### Dark Mode

Add to `lib/main.dart`:
```dart
themeMode: ThemeMode.system,  // Follows device theme
darkTheme: ThemeData.dark(
  useMaterial3: true,
),
```

---

## Environment Variables

Create `.env` file:
```
API_BASE_URL=http://192.168.1.100
API_TIMEOUT=30
APP_VERSION=1.0.0
```

Use in code:
```dart
import 'package:flutter_dotenv/flutter_dotenv.dart';

static const String baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://127.0.0.1');
```

---

## Testing Configurations

### Development Build
```bash
flutter build apk  # Unoptimized, faster builds
```

### Release Build
```bash
flutter build apk --release  # Optimized, smaller size, slower build
```

### Profile Build (Performance Testing)
```bash
flutter build apk --profile
```

---

## Quick Customization Checklist

- [ ] Update API URL in `api_service.dart`
- [ ] Change app name in `strings.xml` and `pubspec.yaml`
- [ ] Update primary color in `main.dart` and `colors.xml`
- [ ] Replace app icon in `mipmap-*` folders
- [ ] Update splash screen in `splash_screen.dart`
- [ ] Set min SDK level if targeting older Android versions
- [ ] Test with `flutter run`
- [ ] Build release APK with `flutter build apk --release`

---

For more details, see `README.md` and `QUICKSTART.md`
